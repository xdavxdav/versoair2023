import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAdminPanel } from "../middleware/auth";
import {
  DEFAULT_PAGE_READINESS_CONFIG,
  enforceProductionPreviewGates,
  isPageReadinessCandidate,
  isLocalPreviewOnlyPath,
  migratePageReadinessConfig,
  normalizePublicPagePath,
  type PageReadinessConfig,
} from "@shared/page-readiness";

const router = Router();
const settingKey = "page_readiness_gates";

const changeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), path: z.string().max(255) }).strict(),
  z.object({ action: z.literal("remove"), path: z.string().max(255) }).strict(),
  z
    .object({
      action: z.literal("set-blocked"),
      path: z.string().max(255),
      blocked: z.boolean(),
    })
    .strict(),
]);

const configSchema = z.object({
  version: z.number().int().positive().optional(),
  eligiblePaths: z.array(z.string()).max(100),
  blockedPaths: z.array(z.string()).max(100),
});

function parseConfig(value: unknown): PageReadinessConfig {
  const parsed = configSchema.parse(value);
  const version = parsed.version ?? 1;
  const eligiblePaths = parsed.eligiblePaths.map(normalizePublicPagePath);
  const blockedPaths = parsed.blockedPaths.map(normalizePublicPagePath);
  if (
    eligiblePaths.some((path, index) => path === null || path !== parsed.eligiblePaths[index]) ||
    blockedPaths.some((path, index) => path === null || path !== parsed.blockedPaths[index]) ||
    eligiblePaths.some(
      (path) =>
        path !== null &&
        !isPageReadinessCandidate(path) &&
        !(version < DEFAULT_PAGE_READINESS_CONFIG.version && path === "/docs"),
    ) ||
    new Set(parsed.eligiblePaths).size !== parsed.eligiblePaths.length ||
    new Set(parsed.blockedPaths).size !== parsed.blockedPaths.length ||
    parsed.blockedPaths.some((path) => !parsed.eligiblePaths.includes(path))
  ) {
    throw new Error("Stored page readiness settings are invalid.");
  }
  return { ...parsed, version };
}

async function readConfig(): Promise<PageReadinessConfig> {
  const result = await pool.query<{ value: unknown }>(
    "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
    [settingKey],
  );
  const stored = result.rows[0]?.value;
  if (stored === undefined) {
    return {
      version: DEFAULT_PAGE_READINESS_CONFIG.version,
      eligiblePaths: [...DEFAULT_PAGE_READINESS_CONFIG.eligiblePaths],
      blockedPaths: [...DEFAULT_PAGE_READINESS_CONFIG.blockedPaths],
    };
  }

  const config = parseConfig(stored);
  if (config.version >= DEFAULT_PAGE_READINESS_CONFIG.version) return config;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(74319020)");
    const currentResult = await client.query<{ value: unknown }>(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1 FOR UPDATE",
      [settingKey],
    );
    const current = currentResult.rows[0]?.value;
    if (current === undefined) {
      await client.query("COMMIT");
      return {
        version: DEFAULT_PAGE_READINESS_CONFIG.version,
        eligiblePaths: [...DEFAULT_PAGE_READINESS_CONFIG.eligiblePaths],
        blockedPaths: [...DEFAULT_PAGE_READINESS_CONFIG.blockedPaths],
      };
    }
    const migrated = migratePageReadinessConfig(parseConfig(current));
    await client.query(
      "UPDATE system_settings SET value = $2::jsonb, updated_at = NOW() WHERE key = $1",
      [settingKey, JSON.stringify(migrated)],
    );
    await client.query("COMMIT");
    return migrated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const config = enforceProductionPreviewGates(
      await readConfig(),
      process.env.NODE_ENV === "production",
    );
    res.set("Cache-Control", "no-store");
    res.json({ blockedPaths: config.blockedPaths });
  }),
);

router.get(
  "/admin",
  requireAdminPanel,
  asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(
      enforceProductionPreviewGates(
        await readConfig(),
        process.env.NODE_ENV === "production",
      ),
    );
  }),
);

router.post(
  "/admin",
  requireAdminPanel,
  asyncHandler(async (req, res) => {
    const input = changeSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ success: false, error: "Invalid page gate change." });
      return;
    }

    const normalizedPath = normalizePublicPagePath(input.data.path);
    if (!normalizedPath || !isPageReadinessCandidate(normalizedPath)) {
      res.status(400).json({
        success: false,
        error: "Choose a route from the public page catalogue. Account and admin routes cannot be gated here.",
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(74319020)");
      const storedResult = await client.query<{ value: unknown }>(
        "SELECT value FROM system_settings WHERE key = $1 LIMIT 1 FOR UPDATE",
        [settingKey],
      );
      const stored = storedResult.rows[0]?.value;
      let config: PageReadinessConfig =
        stored === undefined
          ? {
            version: DEFAULT_PAGE_READINESS_CONFIG.version,
            eligiblePaths: [...DEFAULT_PAGE_READINESS_CONFIG.eligiblePaths],
            blockedPaths: [...DEFAULT_PAGE_READINESS_CONFIG.blockedPaths],
            }
          : migratePageReadinessConfig(parseConfig(stored));
      config = enforceProductionPreviewGates(
        config,
        process.env.NODE_ENV === "production",
      );

      if (
        process.env.NODE_ENV === "production" &&
        isLocalPreviewOnlyPath(normalizedPath) &&
        (input.data.action === "remove" ||
          (input.data.action === "set-blocked" && !input.data.blocked))
      ) {
        res.status(409).json({
          success: false,
          error: "This page is preview-only on localhost and cannot be opened on production.",
        });
        await client.query("ROLLBACK");
        return;
      }

      if (input.data.action === "add") {
        if (config.eligiblePaths.includes(normalizedPath)) {
          res.status(409).json({ success: false, error: "That page is already eligible." });
          await client.query("ROLLBACK");
          return;
        }
        if (config.eligiblePaths.length >= 100) {
          res.status(409).json({ success: false, error: "The eligible page limit has been reached." });
          await client.query("ROLLBACK");
          return;
        }
        config.eligiblePaths = [...config.eligiblePaths, normalizedPath].sort();
      } else if (input.data.action === "remove") {
        if (!config.eligiblePaths.includes(normalizedPath)) {
          res.status(404).json({ success: false, error: "That page is not eligible." });
          await client.query("ROLLBACK");
          return;
        }
        config.eligiblePaths = config.eligiblePaths.filter(
          (path) => path !== normalizedPath,
        );
        config.blockedPaths = config.blockedPaths.filter(
          (path) => path !== normalizedPath,
        );
      } else {
        if (!config.eligiblePaths.includes(normalizedPath)) {
          res.status(400).json({ success: false, error: "Mark the page eligible before blocking it." });
          await client.query("ROLLBACK");
          return;
        }
        config.blockedPaths = input.data.blocked
          ? [...new Set([...config.blockedPaths, normalizedPath])].sort()
          : config.blockedPaths.filter((path) => path !== normalizedPath);
      }

      await client.query(
        `INSERT INTO system_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by,
             updated_at = EXCLUDED.updated_at`,
        [settingKey, JSON.stringify(config), Number(req.user!.userId)],
      );
      await client.query("COMMIT");
      res.set("Cache-Control", "no-store");
      res.json(
        enforceProductionPreviewGates(
          config,
          process.env.NODE_ENV === "production",
        ),
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

export default router;

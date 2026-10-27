import { Router, type Request } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();
const ALLOWED_SECTORS = new Set([
  "commerce",
  "hotellerie",
  "batiment",
  "automobile",
  "finances",
  "careers",
  "music",
  "realestate",
  "annuaire",
]);
const MAX_SETTINGS = 50;
const MAX_SETTING_VALUE_BYTES = 4096;
const MAX_SETTINGS_BYTES = 16_384;

function getSessionUserId(req: Request): number {
  const userId = Number(req.user?.userId);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : 0;
}

function isValidSector(sector: string): boolean {
  return ALLOWED_SECTORS.has(sector);
}

// GET /api/settings — all settings for current user
router.get("/", requireAuth(), async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .execute();

    const settingsBySector: Record<string, Record<string, any>> = {};
    settings.forEach((setting) => {
      if (!settingsBySector[setting.sector]) {
        settingsBySector[setting.sector] = {};
      }
      try {
        settingsBySector[setting.sector][setting.settingKey] = JSON.parse(
          setting.settingValue || setting.defaultValue || "false",
        );
      } catch {
        settingsBySector[setting.sector][setting.settingKey] =
          setting.settingValue || setting.defaultValue;
      }
    });

    res.json({ success: true, settings: settingsBySector });
  } catch (error: any) {
    console.error("Error fetching all settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
      details: error.message,
    });
  }
});

// GET /api/settings/:sector
router.get("/:sector", requireAuth(), async (req, res) => {
  try {
    const { sector } = req.params;
    if (!isValidSector(sector)) {
      return res.status(400).json({ success: false, error: "Unsupported settings sector" });
    }
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(
        and(
          eq(schema.userSettings.userId, userId),
          eq(schema.userSettings.sector, sector),
        ),
      )
      .execute();

    const settingsObj: Record<string, any> = {};
    settings.forEach((setting) => {
      try {
        settingsObj[setting.settingKey] = JSON.parse(
          setting.settingValue || setting.defaultValue || "false",
        );
      } catch {
        settingsObj[setting.settingKey] =
          setting.settingValue || setting.defaultValue;
      }
    });

    res.json({ success: true, sector, settings: settingsObj });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
      details: error.message,
    });
  }
});

// POST /api/settings/:sector
router.post("/:sector", requireAuth(), async (req, res) => {
  try {
    const { sector } = req.params;
    const { settings } = req.body;
    if (!isValidSector(sector)) {
      return res.status(400).json({ success: false, error: "Unsupported settings sector" });
    }
    const userId = getSessionUserId(req);
    if (
      !userId ||
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }
    const entries = Object.entries(settings);
    if (entries.length > MAX_SETTINGS) {
      return res.status(400).json({ success: false, error: "Too many settings" });
    }
    let totalBytes = 0;
    for (const [key, value] of entries) {
      if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(key)) {
        return res.status(400).json({ success: false, error: "Invalid setting key" });
      }
      const settingValue = JSON.stringify(value);
      if (settingValue === undefined) {
        return res.status(400).json({ success: false, error: `Invalid value for ${key}` });
      }
      const bytes = Buffer.byteLength(settingValue, "utf8");
      if (bytes > MAX_SETTING_VALUE_BYTES) {
        return res.status(400).json({ success: false, error: `Setting ${key} is too large` });
      }
      totalBytes += bytes;
    }
    if (totalBytes > MAX_SETTINGS_BYTES) {
      return res.status(400).json({ success: false, error: "Settings payload is too large" });
    }

    const updated: string[] = [];

    for (const [key, value] of entries) {
      const settingValue = JSON.stringify(value);

      await db
        .insert(schema.userSettings)
        .values({
          userId,
          sector,
          settingKey: key,
          settingValue,
          dataType: typeof value,
        })
        .onConflictDoUpdate({
          target: [
            schema.userSettings.userId,
            schema.userSettings.sector,
            schema.userSettings.settingKey,
          ],
          set: {
            settingValue,
            dataType: typeof value,
            updatedAt: new Date(),
          },
        })
        .execute();

      updated.push(key);
    }

    res.json({
      success: true,
      sector,
      updated,
      message: `Updated ${updated.length} settings`,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update settings",
      details: error.message,
    });
  }
});

export default router;

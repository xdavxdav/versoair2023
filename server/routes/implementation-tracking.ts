import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAdminPanel, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { IMPLEMENTATION_LOTS, WORK_STATUSES } from "@shared/implementation-plan";

const router = Router();
const currentRelease =
  process.env.RENDER_GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  null;

router.get(
  "/",
  requireAdminPanel,
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      "SELECT * FROM implementation_tracking ORDER BY lot_id",
    );
    res.set("Cache-Control", "no-store");
    res.json(
      IMPLEMENTATION_LOTS.map((lot) => ({
        ...lot,
        status: "in-review",
        evidence: "",
        blocker: "",
        release: currentRelease,
        ...rows.find((row) => row.lot_id === lot.id),
      })),
    );
  }),
);

router.get(
  "/activity",
  requireAdminPanel,
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT al.id, al.entity_id AS "lotId", al.changes,
              al.changes->>'release' AS release, al.created_at AS "createdAt",
              COALESCE(u.display_name, u.username, u.email, 'System') AS "changedBy"
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'implementation_lot'
       ORDER BY al.created_at DESC
       LIMIT 200`,
    );
    res.set("Cache-Control", "no-store");
    res.json(rows);
  }),
);

router.get(
  "/signals",
  requireOwner,
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT al.id, al.entity_id AS "lotId", al.changes,
              al.changes->>'release' AS release, al.created_at AS "createdAt",
              COALESCE(u.display_name, u.username, u.email, 'Unknown Admin') AS "reportedBy"
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity_type = 'implementation_lot_signal'
       ORDER BY al.created_at DESC
       LIMIT 200`,
    );
    res.set("Cache-Control", "no-store");
    res.json(rows);
  }),
);

router.post(
  "/signals",
  requireAdminPanel,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        lotId: z.string().refine((id) => IMPLEMENTATION_LOTS.some((lot) => lot.id === id)),
        message: z.string().trim().min(1).max(2000),
      })
      .strict()
      .safeParse(req.body);
    if (!input.success) {
      res.status(400).json({
        success: false,
        error: "Select a valid lot and provide a signal (up to 2000 characters).",
      });
      return;
    }

    const ownerEmail = process.env.SUPERADMIN_EMAIL?.trim();
    if (!ownerEmail) {
      res.status(503).json({
        success: false,
        error: "The configured owner could not be resolved; signal was not sent.",
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ownerResult = await client.query<{ id: number }>(
        `SELECT id FROM users
         WHERE lower(email) = lower($1) AND role = 'superuser'
         LIMIT 1`,
        [ownerEmail],
      );
      const ownerId = ownerResult.rows[0]?.id;
      if (!ownerId) {
        await client.query("ROLLBACK");
        res.status(503).json({
          success: false,
          error: "The configured owner account could not be resolved; signal was not sent.",
        });
        return;
      }

      const signalMessage = input.data.message;
      await client.query(
        `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, changes)
         VALUES ($1, 'IMPLEMENTATION_TRACKER_SIGNAL', 'implementation_lot_signal', $2, $3)`,
        [
          Number(req.user!.userId),
          input.data.lotId,
          JSON.stringify({ message: signalMessage, release: currentRelease }),
        ],
      );
      await client.query(
        `INSERT INTO notifications
           (user_id, from_user_id, type, title, message,
            related_entity_type, related_entity_id, action_url)
         VALUES ($1, $2, 'implementation_tracker_signal',
                 'Implementation tracker signal', $3,
                 'implementation_lot', $4, '/geo-admin/dashboard')`,
        [
          ownerId,
          Number(req.user!.userId),
          `${input.data.lotId}: ${signalMessage}`,
          input.data.lotId,
        ],
      );
      await client.query("COMMIT");
      res.status(201).json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.put(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const lot = IMPLEMENTATION_LOTS.find((item) => item.id === req.params.id);
    const input = z
      .object({
        status: z.enum(WORK_STATUSES),
        evidence: z.string().trim().max(10000),
        blocker: z.string().trim().max(2000),
      })
      .strict()
      .safeParse(req.body);
    if (!lot || !input.success) {
      res
        .status(400)
        .json({ success: false, error: "Invalid lot or tracking update" });
      return;
    }
    if (
      ["tested", "deployed", "live-verified"].includes(input.data.status) &&
      !input.data.evidence
    ) {
      res.status(400).json({
        success: false,
        error: "Test/deployment/live verification evidence is required",
      });
      return;
    }
    if (input.data.status === "blocked" && !input.data.blocker) {
      res.status(400).json({ success: false, error: "Describe the blocker" });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(74319019)");
      const { rows: dependencies } = await client.query<{
        lot_id: string;
        status: string;
      }>("SELECT lot_id,status FROM implementation_tracking");
      if (
        !["deployed", "live-verified"].includes(input.data.status) &&
        IMPLEMENTATION_LOTS.some(
          (dependent) =>
            dependent.dependsOn.some((id) => id === lot.id) &&
            dependencies.some(
              (row) =>
                row.lot_id === dependent.id &&
                ["deployed", "live-verified"].includes(row.status),
            ),
        )
      ) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error:
            "A deployed dependent lot must be reviewed before downgrading this prerequisite",
        });
        return;
      }
      if (
        ["deployed", "live-verified"].includes(input.data.status) &&
        lot.dependsOn.some(
          (id) =>
            !dependencies.some(
              (row) =>
                row.lot_id === id &&
                ["deployed", "live-verified"].includes(row.status),
            ),
        )
      ) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Dependencies must be deployed first",
        });
        return;
      }
      const { rows } = await client.query(
        `INSERT INTO implementation_tracking(lot_id,status,evidence,blocker,updated_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT(lot_id) DO UPDATE
         SET status=$2,evidence=$3,blocker=$4,updated_by=$5,updated_at=NOW()
         RETURNING *`,
        [
          lot.id,
          input.data.status,
          input.data.evidence,
          input.data.blocker,
          Number(req.user!.userId),
        ],
      );
      await client.query(
        `INSERT INTO audit_logs(user_id,action,entity_type,entity_id,changes)
         VALUES ($1,'IMPLEMENTATION_TRACKING_UPDATED','implementation_lot',$2,$3)`,
        [
          Number(req.user!.userId),
          lot.id,
          JSON.stringify({ ...input.data, release: currentRelease }),
        ],
      );
      await client.query("COMMIT");
      res.json(rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

export default router;

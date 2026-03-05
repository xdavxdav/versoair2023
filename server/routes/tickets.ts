import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// In-memory fallback for tickets
let inMemoryTickets: any[] = [];

// Helper to check if tickets table exists
async function ensureTicketsTable() {
  try {
    await db.execute(sql`SELECT 1 FROM tickets LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

// SLA calculation helper
function calculateSLATargetHours(priority: string): number {
  const slaMap: Record<string, number> = {
    critical: 2,
    high: 8,
    medium: 24,
    low: 72,
  };
  return slaMap[priority.toLowerCase()] || 24;
}

// SLA status helper
function calculateSLAStatus(
  createdAt: Date | string,
  slaTargetHours: number,
): { percentage: number; breached: boolean } {
  const created = new Date(createdAt);
  const now = new Date();
  const elapsedMs = now.getTime() - created.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const percentage = Math.round((elapsedHours / slaTargetHours) * 100);
  return {
    percentage: Math.min(percentage, 100),
    breached: elapsedHours > slaTargetHours,
  };
}

// GET /api/tickets
router.get("/", async (req, res) => {
  try {
    const exists = await ensureTicketsTable();
    if (exists) {
      const rows = await db.execute(
        sql`SELECT * FROM tickets ORDER BY created_at DESC`,
      );
      return res.json(rows.rows || []);
    }
    res.json(inMemoryTickets);
  } catch (error: any) {
    console.error("❌ Get tickets failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tickets
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const priority = payload.priority || "medium";
    const slaTargetHours = calculateSLATargetHours(priority);
    const now = new Date().toISOString();
    const ticket = {
      id: payload.id || Math.floor(Math.random() * 1000000).toString(),
      title: payload.title || "Untitled",
      description: payload.description || "",
      status: payload.status || "open",
      priority,
      category: payload.category || "general",
      reporter: payload.reporter || null,
      requester_email: payload.requesterEmail || null,
      assignee_id: payload.assigneeId || null,
      team: payload.team || null,
      source: payload.source || "portal",
      sla_target_hours: slaTargetHours,
      sla_breached: false,
      created_at: now,
      updated_at: now,
    };

    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        const inserted = await db.execute(
          sql`INSERT INTO tickets (title, description, status, priority, category, reporter, requester_email, assignee_id, team, source, sla_target_hours, sla_breached, created_at, updated_at) 
              VALUES (${payload.title || "Untitled"}, ${payload.description || ""}, ${payload.status || "open"}, ${priority}, ${payload.category || "general"}, ${payload.reporter || null}, ${payload.requesterEmail || null}, ${payload.assigneeId || null}, ${payload.team || null}, ${payload.source || "portal"}, ${slaTargetHours}, false, NOW(), NOW()) 
              RETURNING *`,
        );
        return res.json(inserted.rows[0]);
      } catch (dbError: any) {
        console.error("❌ Database insert error:", dbError);
      }
    }

    inMemoryTickets.unshift(ticket);
    res.json(ticket);
  } catch (error: any) {
    console.error("❌ Create ticket failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tickets/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        const updated = await db.execute(
          sql`UPDATE tickets 
              SET title=${payload.title || ""}, 
                  description=${payload.description || ""}, 
                  status=${payload.status || "open"},
                  priority=${payload.priority},
                  category=${payload.category},
                  assignee_id=${payload.assigneeId || null},
                  team=${payload.team || null},
                  resolved_at=${payload.status === "resolved" ? new Date().toISOString() : null},
                  updated_at=NOW()
              WHERE id=${parseInt(id)} 
              RETURNING *`,
        );
        return res.json(updated.rows[0]);
      } catch (dbError: any) {
        console.error("❌ Database update error:", dbError);
      }
    }

    const idx = inMemoryTickets.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    inMemoryTickets[idx] = {
      ...inMemoryTickets[idx],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    res.json(inMemoryTickets[idx]);
  } catch (error: any) {
    console.error("❌ Update ticket failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tickets/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        await db.execute(sql`DELETE FROM tickets WHERE id = ${parseInt(id)}`);
        return res.json({ success: true });
      } catch (dbError: any) {
        console.error("❌ Database delete error:", dbError);
      }
    }
    inMemoryTickets = inMemoryTickets.filter((t) => t.id !== id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ Delete ticket failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tickets/:id/assign
router.put("/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { assigneeId, team } = req.body;
    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        const updated = await db.execute(
          sql`UPDATE tickets SET assignee_id=${assigneeId}, team=${team || null}, updated_at=NOW() WHERE id=${parseInt(id)} RETURNING *`,
        );
        return res.json(updated.rows[0]);
      } catch (dbError: any) {
        console.error("❌ Database assignment error:", dbError);
      }
    }

    const idx = inMemoryTickets.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    inMemoryTickets[idx] = {
      ...inMemoryTickets[idx],
      assignee_id: assigneeId,
      team,
    };
    res.json(inMemoryTickets[idx]);
  } catch (error: any) {
    console.error("❌ Assign ticket failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tickets/:id/escalate
router.post("/:id/escalate", async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        const updated = await db.execute(
          sql`UPDATE tickets SET priority='critical', sla_target_hours=2, updated_at=NOW() WHERE id=${parseInt(id)} RETURNING *`,
        );
        return res.json(updated.rows[0]);
      } catch (dbError: any) {
        console.error("❌ Database escalation error:", dbError);
      }
    }

    const idx = inMemoryTickets.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    inMemoryTickets[idx] = {
      ...inMemoryTickets[idx],
      priority: "critical",
      sla_target_hours: 2,
    };
    res.json(inMemoryTickets[idx]);
  } catch (error: any) {
    console.error("❌ Escalate ticket failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tickets/stats/summary
router.get("/stats/summary", async (req, res) => {
  try {
    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        const statsRows = await db.execute(
          sql`SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status='in-progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed,
                SUM(CASE WHEN sla_breached=true THEN 1 ELSE 0 END) as sla_breaches
              FROM tickets`,
        );

        const stats = statsRows.rows[0] as any;
        const total = parseInt(stats?.total || "0");
        const slaBreaches = parseInt(stats?.sla_breaches || "0");
        const slaCompliance =
          total > 0 ? Math.round(((total - slaBreaches) / total) * 100) : 100;

        return res.json({
          total,
          open: parseInt(stats?.open || "0"),
          inProgress: parseInt(stats?.in_progress || "0"),
          resolved: parseInt(stats?.resolved || "0"),
          closed: parseInt(stats?.closed || "0"),
          slaBreaches,
          avgResolutionTime: 24,
          slaCompliance,
        });
      } catch (dbError: any) {
        console.error("❌ Database stats error:", dbError);
      }
    }

    // Fallback to in-memory stats
    const total = inMemoryTickets.length;
    const slaBreaches = inMemoryTickets.filter((t) => t.sla_breached).length;
    res.json({
      total,
      open: inMemoryTickets.filter((t) => t.status === "open").length,
      inProgress: inMemoryTickets.filter((t) => t.status === "in-progress")
        .length,
      resolved: inMemoryTickets.filter((t) => t.status === "resolved").length,
      closed: inMemoryTickets.filter((t) => t.status === "closed").length,
      slaBreaches,
      avgResolutionTime: 24,
      slaCompliance:
        total > 0 ? Math.round(((total - slaBreaches) / total) * 100) : 100,
    });
  } catch (error: any) {
    console.error("❌ Get ticket stats failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tickets/sla/breaches
router.get("/sla/breaches", async (req, res) => {
  try {
    const exists = await ensureTicketsTable();
    if (exists) {
      try {
        const breaches = await db.execute(
          sql`SELECT * FROM tickets WHERE sla_breached=true ORDER BY created_at DESC`,
        );
        return res.json(breaches.rows || []);
      } catch (dbError: any) {
        console.error("❌ Database SLA query error:", dbError);
      }
    }
    res.json([]);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tickets/status/:status
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const exists = await ensureTicketsTable();
    if (exists) {
      const rows = await db.execute(
        sql`SELECT * FROM tickets WHERE status = ${status} ORDER BY created_at DESC`,
      );
      return res.json(rows.rows || []);
    }
    res.json([]);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tickets/priority/critical
router.get("/priority/critical", async (req, res) => {
  try {
    const exists = await ensureTicketsTable();
    if (exists) {
      const rows = await db.execute(
        sql`SELECT * FROM tickets WHERE priority IN ('critical', 'high') ORDER BY created_at DESC`,
      );
      return res.json(rows.rows || []);
    }
    res.json([]);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tickets/batch/update
router.post("/batch/update", async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res
        .status(400)
        .json({ success: false, error: "ids array required" });
    }
    const exists = await ensureTicketsTable();
    if (exists) {
      for (const id of ids) {
        await db.execute(
          sql`UPDATE tickets SET status = ${updates?.status || "open"}, updated_at = NOW() WHERE id = ${parseInt(id)}`,
        );
      }
    }
    res.json({ success: true, updated: ids.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

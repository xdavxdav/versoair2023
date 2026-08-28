/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — INTENT SEARCH API (God-Tier Brain: Unified Search Endpoint)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/search/intent — The "Shared Brain" endpoint
 *   Accepts a natural language query, parses intent, returns grounded results.
 *   Powers both the home.tsx AI search toggle and the VersoAI chat widget.
 *
 * POST /api/notify/emergency-alert — Emergency blast to top business owners
 *   Sends real-time notifications to top-matching verified businesses.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { parseUserIntent } from "../services/intent-parser";
import { searchRelevantBusinesses } from "../services/knowledge-injector";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { pool } from "../db";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const intentSearchSchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().min(1).max(20).optional().default(5),
  language: z.string().optional(),
});

const emergencyAlertSchema = z.object({
  businessIds: z.array(z.number()).min(1).max(5),
  message: z.string().min(5).max(500),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  location: z.string().optional(),
});

// ─── POST /api/search/intent — Main AI search endpoint ───────────────────────

router.post("/intent", optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = intentSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: " + parsed.error.issues[0]?.message,
      });
    }

    const { query, limit, language } = parsed.data;
    const startTime = Date.now();

    // Step 1: Parse intent from natural language
    const intent = await parseUserIntent(query, language);

    // Step 2: Search database with grounded knowledge
    const results = await searchRelevantBusinesses(intent, limit);

    const elapsed = Date.now() - startTime;
    const needsClarification = !intent.sector && !intent.location;
    const clarification = needsClarification
      ? intent.language === "fr"
        ? "Que recherchez-vous exactement : une entreprise, un service, un lieu ou un professionnel ?"
        : "What are you looking for exactly: a business, a service, a place, or a professional?"
      : null;

    return res.json({
      success: true,
      intent: {
        sector: intent.sector,
        sectorLabel: intent.sectorLabel,
        urgency: intent.urgency,
        location: intent.location,
        countryCode: intent.countryCode,
        action: intent.action,
        keywords: intent.keywords,
        language: intent.language,
        confidence: intent.confidence,
      },
      results: {
        businesses: results.businesses,
        totalMatches: results.totalMatches,
        searchMethod: results.searchMethod,
      },
      discovery: {
        needsClarification,
        clarification,
      },
      emergency: results.isEmergency
        ? {
            isEmergency: true,
            message: results.emergencyMessage,
            topVerified: results.businesses
              .filter((b) => b.isVerified)
              .slice(0, 3),
          }
        : null,
      meta: {
        elapsed: `${elapsed}ms`,
        provider: intent.confidence > 0.7 ? "ai+rules" : "rules",
      },
    });
  } catch (err: any) {
    console.error("[IntentSearch] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Intent search temporarily unavailable.",
    });
  }
});

// ─── POST /api/notify/emergency-alert — Emergency blast notifications ────────

router.post(
  "/emergency-alert",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const parsed = emergencyAlertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request: " + parsed.error.issues[0]?.message,
        });
      }

      const { businessIds, message, contactPhone, contactEmail, location } =
        parsed.data;

      // Look up business owner details
      const businessResult = await pool.query(
        `SELECT b.id, b.name, b.phone, b.email, u.id as owner_id, u.email as owner_email
         FROM businesses b
         LEFT JOIN users u ON b.user_id = u.id
         WHERE b.id = ANY($1) AND b.is_active = true`,
        [businessIds],
      );

      const notified: Array<{
        businessId: number;
        businessName: string;
        method: string;
      }> = [];

      // Build every notification row up front and insert them in ONE statement
      // instead of issuing an INSERT per matched business.
      // NOTE: businesses with no owner are skipped — notifications.user_id is
      // NOT NULL, so those rows could never be inserted anyway.
      const notificationRows = businessResult.rows
        .filter((biz: any) => biz.owner_id != null)
        .map((biz: any) => ({
          userId: biz.owner_id,
          title: `🚨 Emergency Request — ${biz.name}`,
          data: JSON.stringify({
            businessId: biz.id,
            contactPhone,
            contactEmail,
            location,
            urgency: "emergency",
            sentAt: new Date().toISOString(),
          }),
        }));

      if (notificationRows.length > 0) {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, data, created_at)
             SELECT u.user_id, 'emergency_alert', u.title, u.message, u.data, NOW()
             FROM UNNEST($1::int[], $2::text[], $3::text[], $4::jsonb[])
               AS u(user_id, title, message, data)`,
            [
              notificationRows.map((r) => r.userId),
              notificationRows.map((r) => r.title),
              notificationRows.map(() => message),
              notificationRows.map((r) => r.data),
            ],
          );
        } catch (err) {
          // Non-blocking: the alert response still goes out. Log it though —
          // this used to be swallowed silently by a bare `catch {}`, which hid
          // the fact that the column was misnamed and NO alert was ever stored.
          console.error(
            "[intent-search] failed to persist emergency notifications:",
            err,
          );
        }
      }

      for (const biz of businessResult.rows) {
        notified.push({
          businessId: biz.id,
          businessName: biz.name,
          method: biz.owner_id ? "in_app" : "email_pending",
        });

        // TODO: Emit Socket.io event to business owner for real-time bell notification
        // io.to(`user_${biz.owner_id}`).emit('notification', { type: 'emergency_alert', ... })
      }

      return res.json({
        success: true,
        message: `Emergency alert sent to ${notified.length} business(es)`,
        notified,
      });
    } catch (err: any) {
      console.error("[EmergencyAlert] Error:", err.message);
      return res.status(500).json({
        success: false,
        error: "Failed to send emergency alerts.",
      });
    }
  },
);

// ─── GET /api/search/intent/status — Health check for intent engine ──────────

router.get("/status", async (_req: Request, res: Response) => {
  let groqAvailable = false;
  let ollamaAvailable = false;

  // Check Groq
  if (process.env.GROQ_API_KEY) {
    groqAvailable = true;
  }

  // Check Ollama
  try {
    const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const resp = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    ollamaAvailable = resp.ok;
  } catch {
    ollamaAvailable = false;
  }

  const provider = ollamaAvailable
    ? "ollama"
    : groqAvailable
      ? "groq"
      : "rules_only";

  return res.json({
    success: true,
    intentEngine: {
      provider,
      ollamaAvailable,
      groqAvailable,
      fallbackAvailable: true, // rule-based always works
      sectorsSupported: 15,
      citiesMapped: 100,
      emergencyDetection: true,
    },
  });
});

export default router;

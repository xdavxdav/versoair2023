import { Router, Request, Response } from "express";
import { z } from "zod";
import { chat, groundedChat } from "../services/ai-service";
import { optionalAuth } from "../middleware/auth";
import {
  getConnectorStatuses,
  runAllConnectors,
} from "../services/data-connectors";
import { parseUserIntent } from "../services/intent-parser";
import { searchRelevantBusinesses } from "../services/knowledge-injector";

const router = Router();

// Apply optional auth to all AI routes — attaches user if logged in
router.use(optionalAuth);

// ─── Validation schema ────────────────────────────────────────────────────────
const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
});

const askSchema = z.object({
  question: z.string().min(1).max(2000),
});

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const parsed = chatSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: " + parsed.error.issues[0]?.message,
      });
    }

    const { messages } = parsed.data;
    const userRole = req.user?.role;

    const result = await chat(messages, userRole);

    return res.json({
      success: true,
      reply: result.reply,
      provider: result.provider,
      sources: result.sources,
      searchMethod: result.searchMethod,
    });
  } catch (err: any) {
    console.error("[VersoAI] /api/ai/chat error:", err?.message ?? err);
    return res.status(500).json({
      success: false,
      error: "VersoAI is temporarily unavailable. Please try again.",
    });
  }
});

// ─── POST /api/ai/ask — Grounded Q&A (answer + cited sources) ────────────────
router.post("/ask", async (req: Request, res: Response) => {
  try {
    const parsed = askSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: " + parsed.error.issues[0]?.message,
      });
    }

    const { question } = parsed.data;
    const userRole = req.user?.role;

    const result = await groundedChat(question, userRole);

    return res.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      searchMethod: result.searchMethod,
      confidence: result.confidence,
    });
  } catch (err: any) {
    console.error("[VersoAI] /api/ai/ask error:", err?.message ?? err);
    return res.status(500).json({
      success: false,
      error: "VersoAI grounded search is temporarily unavailable.",
    });
  }
});

// ─── POST /api/ai/smart-chat — Intent-enriched chat (Shared Brain) ───────────
router.post("/smart-chat", async (req: Request, res: Response) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: " + parsed.error.issues[0]?.message,
      });
    }

    const { messages } = parsed.data;
    const userRole = req.user?.role;
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Parse intent from the last user message
    const intent = await parseUserIntent(lastUserMsg);

    // If intent identifies a sector or emergency, ground with DB results
    let knowledgeContext = "";
    let intentSources: Array<{ name: string; snippet: string }> = [];

    if (intent.sector || intent.urgency >= 5 || intent.keywords.length > 0) {
      try {
        const knowledge = await searchRelevantBusinesses(intent, 5);
        if (knowledge.businesses.length > 0) {
          knowledgeContext =
            "\n\n[INTENT-GROUNDED RESULTS — real businesses matching user intent]\n" +
            `Detected sector: ${intent.sectorLabel || "general"} | Urgency: ${intent.urgency}/10 | Location: ${intent.location || "any"}\n` +
            knowledge.businesses
              .map(
                (b) =>
                  `• ${b.name} (${b.categoryName}) — ${b.city || b.country || "N/A"} | ★${(b.rating ?? 0).toFixed(1)} | Tier: ${b.tier || "free"}` +
                  (b.isVerified ? " ✅ Verified" : ""),
              )
              .join("\n") +
            "\n[/INTENT-GROUNDED RESULTS]";

          intentSources = knowledge.businesses.map((b) => ({
            name: b.name,
            snippet: `${b.categoryName} | ${b.city || b.country || ""} | ★${(b.rating ?? 0).toFixed(1)}`,
          }));
        }

        if (knowledge.isEmergency && knowledge.emergencyMessage) {
          knowledgeContext += `\n\n🚨 EMERGENCY DETECTED: ${knowledge.emergencyMessage}`;
        }
      } catch (err: any) {
        console.warn(
          "[VersoAI] Intent knowledge injection failed:",
          err.message,
        );
      }
    }

    // Inject intent context into the last user message for the LLM
    const enrichedMessages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === "user" && knowledgeContext) {
        return { ...m, content: m.content + knowledgeContext };
      }
      return m;
    });

    const result = await chat(enrichedMessages, userRole);

    return res.json({
      success: true,
      reply: result.reply,
      provider: result.provider,
      sources: intentSources.length > 0 ? intentSources : result.sources,
      searchMethod: result.searchMethod,
      intent: {
        sector: intent.sector,
        sectorLabel: intent.sectorLabel,
        urgency: intent.urgency,
        location: intent.location,
        confidence: intent.confidence,
      },
    });
  } catch (err: any) {
    console.error("[VersoAI] /api/ai/smart-chat error:", err?.message ?? err);
    return res.status(500).json({
      success: false,
      error: "VersoAI smart chat is temporarily unavailable.",
    });
  }
});

// ─── GET /api/ai/status ───────────────────────────────────────────────────────
router.get("/status", async (_req: Request, res: Response) => {
  let ollamaOnline = false;
  try {
    const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const resp = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    ollamaOnline = resp.ok;
  } catch (_) {
    ollamaOnline = false;
  }

  const groqConfigured = !!process.env.GROQ_API_KEY;
  const status = ollamaOnline ? "ollama" : groqConfigured ? "groq" : "fallback";
  const model = ollamaOnline
    ? (process.env.OLLAMA_MODEL ?? "llama3.2")
    : groqConfigured
      ? (process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile")
      : "rule-based";
  const message = ollamaOnline
    ? "Ollama is running — full AI mode active"
    : groqConfigured
      ? "Groq cloud AI active — full conversational mode"
      : "Smart fallback mode — set GROQ_API_KEY for full AI capabilities";

  return res.json({
    success: true,
    status,
    model,
    message,
    features: {
      fullTextSearch: true,
      groundedResponses: true,
      accessControl: true,
      dataConnectors: true,
    },
  });
});

// ─── GET /api/ai/connectors — Data connector status ──────────────────────────
router.get("/connectors", async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    connectors: getConnectorStatuses(),
  });
});

// ─── POST /api/ai/connectors/run — Trigger all registered connectors ─────────
router.post("/connectors/run", async (req: Request, res: Response) => {
  // Only admins can trigger connector runs
  if (!req.user || !["admin", "superuser"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Admin access required to run data connectors",
    });
  }

  try {
    const result = await runAllConnectors();
    return res.json({
      success: true,
      message: `Ingestion complete: ${result.total} records processed`,
      results: result.results,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Connector run failed: " + (err?.message ?? err),
    });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { z } from "zod";
import { chat, groundedChat } from "../services/ai-service";
import { optionalAuth } from "../middleware/auth";
import {
  getConnectorStatuses,
  runAllConnectors,
} from "../services/data-connectors";

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

  return res.json({
    success: true,
    status: ollamaOnline ? "ollama" : "fallback",
    model: process.env.OLLAMA_MODEL ?? "llama3.2",
    message: ollamaOnline
      ? "Ollama is running — full AI mode active"
      : "Smart fallback mode — install Ollama for full AI capabilities",
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

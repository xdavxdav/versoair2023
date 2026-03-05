import { Router, Request, Response } from "express";
import { z } from "zod";
import { chat } from "../services/ai-service";

const router = Router();

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

    const result = await chat(messages);

    return res.json({
      success: true,
      reply: result.reply,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[VersoAI] /api/ai/chat error:", err?.message ?? err);
    return res.status(500).json({
      success: false,
      error: "VersoAI is temporarily unavailable. Please try again.",
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
  });
});

export default router;

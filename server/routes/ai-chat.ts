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
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import {
  enqueueInboxMessage,
  cacheAIReply,
  getCachedAIReply,
} from "../services/redis-client";

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

// ─── Static FAQ fallback — shown when Ollama AND Groq are both down ──────────
const STATIC_FAQ: Array<{ q: string; a: string; keywords: string[] }> = [
  {
    q: "How do I verify my business?",
    keywords: ["verify", "verification", "document", "badge"],
    a: "To verify your business, go to your Dashboard → Account tab → upload your business registration documents. Verification takes 1-2 business days. You'll receive an email confirmation when done.",
  },
  {
    q: "How do I upgrade my subscription?",
    keywords: [
      "upgrade",
      "tier",
      "plan",
      "essential",
      "verified",
      "max",
      "subscription",
    ],
    a: "You can upgrade from your Dashboard → Account tab → Subscription section, or visit /pricing. Plans start at $29/mo (Essential) up to $149/mo (Pro Max).",
  },
  {
    q: "How do I add photos to my listing?",
    keywords: ["photo", "image", "picture", "gallery", "upload"],
    a: "Go to your Dashboard → select your business → Photos tab. You can upload up to 20 photos. Verified businesses get priority placement in search results.",
  },
  {
    q: "Why is my business not showing in search?",
    keywords: ["search", "not showing", "visibility", "hidden", "appear"],
    a: "Business visibility depends on your subscription tier and verification status. Free tier businesses have 15% visibility. Upgrade to Essential or higher to significantly boost your search appearances.",
  },
  {
    q: "How does Business Networking work?",
    keywords: [
      "network",
      "networking",
      "connect",
      "business contact",
      "partner",
    ],
    a: "Business Networking lets you message verified businesses on the platform. It's available from the Essential plan and above. Go to Dashboard → Inbox → toggle 'Network' to start connecting.",
  },
  {
    q: "I forgot my password",
    keywords: ["password", "forgot", "reset", "login"],
    a: "Go to /auth/signin and click 'Forgot password'. Enter your email and you'll receive a reset link within a few minutes.",
  },
  {
    q: "How do I contact support?",
    keywords: ["support", "help", "contact", "problem", "issue"],
    a: "You're in the right place! I'm VersoAI, your 24/7 support assistant. For urgent account issues, you can also reach our team via Dashboard → Inbox → Support.",
  },
];

function matchFAQ(question: string): string | null {
  const q = question.toLowerCase();
  let best: { answer: string; score: number } | null = null;
  for (const faq of STATIC_FAQ) {
    const score = faq.keywords.filter((k) => q.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { answer: faq.a, score };
    }
  }
  return best ? best.answer : null;
}

// ─── GET /api/ai/support/stream ───────────────────────────────────────────────
// SSE endpoint for VersoAI support chat with tier-aware routing.
//
// Auth: JWT cookie is sent automatically by the browser (HttpOnly cookie).
//       EventSource cannot set headers, so globalAuthGate reads the cookie.
//       This endpoint is NOT in the PUBLIC_PATHS whitelist so it requires auth.
//
// Query params:
//   message     — the user's question (max 2000 chars)
//   convId      — conversation ID (optional; for history context)
//   threadId    — alias for convId (legacy)
//
// Tier routing:
//   free / essential   → standard Ollama + FAQ fallback
//   verified           → intent-enriched (parseUserIntent + DB grounding)
//   max / enterprise   → full smart-chat pipeline + priority queue label
//
router.get("/support/stream", async (req: Request, res: Response) => {
  // Auth is enforced by globalAuthGate; user is always set here.
  const user = req.user;
  if (!user) {
    res.status(401).end();
    return;
  }

  const message = ((req.query.message as string) ?? "")
    .trim()
    .substring(0, 2000);
  const convId = Number(req.query.convId ?? req.query.threadId ?? 0);

  if (!message) {
    res.status(400).json({ error: "message query param is required" });
    return;
  }

  // ── SSE headers ─────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const sendToken = (token: string) => {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  };

  const sendDone = (provider: string) => {
    res.write(`event: done\ndata: ${JSON.stringify({ provider })}\n\n`);
    res.end();
  };

  const sendError = (msg: string) => {
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  };

  // ── Tier detection ───────────────────────────────────────────────────────────
  const tier: string =
    user.role === "superuser"
      ? "enterprise"
      : ((req as any).user?.subscriptionTier ?? "free");

  const isHighTier = ["verified", "max", "enterprise"].includes(tier);
  const isFastTrack = ["max", "enterprise"].includes(tier);

  // ── Redis cache check (avoid re-calling Ollama for identical questions) ─────
  const cacheKey = `${user.userId}:${message.toLowerCase().replace(/\s+/g, " ")}`;
  const cached = await getCachedAIReply(cacheKey);
  if (cached) {
    send("meta", { provider: "cache", tier });
    // Stream cached reply token by token (simulate streaming)
    const words = cached.split(" ");
    for (const word of words) {
      sendToken(word + " ");
      await new Promise((r) => setTimeout(r, 8));
    }
    sendDone("cache");
    return;
  }

  // ── Fetch recent conversation history (last 10 messages) ────────────────────
  let historyMessages: Array<{ role: "user" | "assistant"; content: string }> =
    [];
  if (convId) {
    try {
      const history = await db
        .select({
          content: schema.inboxMessages.content,
          senderId: schema.inboxMessages.senderId,
        })
        .from(schema.inboxMessages)
        .where(eq(schema.inboxMessages.conversationId, convId))
        .orderBy(desc(schema.inboxMessages.createdAt))
        .limit(10);

      historyMessages = history.reverse().map((m) => ({
        role: (m.senderId === "support" ? "assistant" : "user") as
          | "user"
          | "assistant",
        content: m.content,
      }));
    } catch {
      /* DB might be temporarily down — continue without history */
    }
  }

  const messages = [
    ...historyMessages,
    { role: "user" as const, content: message },
  ];

  // ── Intent enrichment for verified+ tiers ───────────────────────────────────
  let knowledgeContext = "";
  if (isHighTier) {
    try {
      const intent = await parseUserIntent(message);
      if (intent.sector || intent.urgency >= 4 || intent.keywords.length > 0) {
        const knowledge = await searchRelevantBusinesses(
          intent,
          isFastTrack ? 8 : 5,
        );
        if (knowledge.businesses.length > 0) {
          knowledgeContext =
            "\n\n[PLATFORM DATA — verified businesses matching your query]\n" +
            knowledge.businesses
              .map(
                (b: any) =>
                  `• ${b.name} (${b.categoryName}) — ${b.city || b.country || "N/A"} | ★${(b.rating ?? 0).toFixed(1)} | ${b.isVerified ? "✅ Verified" : "Unverified"}`,
              )
              .join("\n") +
            "\n[/PLATFORM DATA]";
        }
        if (knowledge.isEmergency && knowledge.emergencyMessage) {
          knowledgeContext += `\n\n🚨 ${knowledge.emergencyMessage}`;
        }
      }
    } catch {
      /* non-critical */
    }
  }

  const enrichedMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === "user" && knowledgeContext) {
      return { ...m, content: m.content + knowledgeContext };
    }
    return m;
  });

  // ── Send tier/meta info to client ────────────────────────────────────────────
  send("meta", { tier, enriched: isHighTier, fastTrack: isFastTrack });

  const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
  const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
  const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  let fullReply = "";

  // ── Attempt 1: Ollama streaming ──────────────────────────────────────────────
  try {
    const ollamaResp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: enrichedMessages,
        stream: true,
        options: { temperature: 0.7, num_predict: 512 },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!ollamaResp.ok || !ollamaResp.body) {
      throw new Error(`Ollama HTTP ${ollamaResp.status}`);
    }

    const reader = ollamaResp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            const token = parsed.message.content;
            fullReply += token;
            sendToken(token);
          }
          if (parsed.done) break;
        } catch {
          /* partial JSON chunk */
        }
      }
    }

    // Cache the full reply for future duplicate questions
    if (fullReply.length > 10) {
      await cacheAIReply(cacheKey, fullReply, 3600);

      // Persist AI reply to conversation history (fire-and-forget)
      if (convId) {
        db.insert(schema.inboxMessages)
          .values({
            conversationId: convId,
            senderId: "support",
            senderName: "VersoAI Support",
            content: fullReply,
            isAi: true,
            isRead: false,
          })
          .catch(() => {
            // DB down → queue for later
            enqueueInboxMessage(user.userId, {
              conversationId: convId,
              senderId: "support",
              senderName: "VersoAI Support",
              content: fullReply,
              isAi: true,
            }).catch(() => {
              /* silent */
            });
          });
      }
    }

    sendDone("ollama");
    return;
  } catch (ollamaErr: any) {
    console.warn("[VersoAI Stream] Ollama unavailable:", ollamaErr?.message);
  }

  // ── Attempt 2: Groq streaming ────────────────────────────────────────────────
  if (GROQ_API_KEY) {
    try {
      const groqResp = await fetch(
        `https://api.groq.com/openai/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: enrichedMessages,
            stream: true,
            max_tokens: 512,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!groqResp.ok || !groqResp.body) {
        throw new Error(`Groq HTTP ${groqResp.status}`);
      }

      const reader = groqResp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              const token = parsed.choices?.[0]?.delta?.content ?? "";
              if (token) {
                fullReply += token;
                sendToken(token);
              }
            } catch {
              /* partial SSE chunk */
            }
          }
        }
      }

      if (fullReply.length > 10) {
        await cacheAIReply(cacheKey, fullReply, 3600);
        if (convId) {
          db.insert(schema.inboxMessages)
            .values({
              conversationId: convId,
              senderId: "support",
              senderName: "VersoAI Support",
              content: fullReply,
              isAi: true,
              isRead: false,
            })
            .catch(() => {
              enqueueInboxMessage(user.userId, {
                conversationId: convId,
                senderId: "support",
                senderName: "VersoAI Support",
                content: fullReply,
                isAi: true,
              }).catch(() => {
                /* silent */
              });
            });
        }
      }

      sendDone("groq");
      return;
    } catch (groqErr: any) {
      console.warn("[VersoAI Stream] Groq unavailable:", groqErr?.message);
    }
  }

  // ── Attempt 3: Static FAQ fallback ──────────────────────────────────────────
  const faqAnswer = matchFAQ(message);
  if (faqAnswer) {
    const words = faqAnswer.split(" ");
    for (const word of words) {
      sendToken(word + " ");
      await new Promise((r) => setTimeout(r, 30));
    }
    sendDone("faq");
    return;
  }

  // ── All providers unavailable ────────────────────────────────────────────────
  const fallback =
    "I'm temporarily unable to connect to my AI backend. Your question has been saved and I'll respond as soon as the service is restored. In the meantime, check our Help Center or try again in a few minutes.";

  // Enqueue support request to Redis so it survives a restart
  if (convId) {
    await enqueueInboxMessage(user.userId, {
      conversationId: convId,
      senderId: "support",
      senderName: "VersoAI Support",
      content: `[Queued — service unavailable] Your question: "${message}"`,
      isAi: true,
    });
  }

  for (const word of fallback.split(" ")) {
    sendToken(word + " ");
    await new Promise((r) => setTimeout(r, 30));
  }
  sendDone("fallback");
});

export default router;

import { buildAIContext, type AIContext } from "./ai-context";

// ─── Configuration ────────────────────────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResult {
  reply: string;
  provider: "ollama" | "fallback";
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are VersoAI, the intelligent business assistant for Verso Air — a multi-sector business intelligence and directory platform.

You help users:
1. Find businesses across sectors: Commerce, Hospitality (Hotellerie), Construction (Batiment), Automotive (Automobile), Finance, Entertainment (Divertissement), Healthcare (Santé), Real Estate (Logement)
2. Get real-time analytics and market insights from the platform database
3. Generate professional business descriptions
4. Suggest the correct directory category for a business
5. Navigate platform features (Reservations, Business Verification, Geo Admin, Artist Portal)

PERSONALITY: Professional, concise, and data-driven. Use real numbers from [CONTEXT DATA] when provided. Format replies with clear structure using **bold** for headings and bullet points. Keep replies under 200 words unless a detailed breakdown is explicitly requested.

IMPORTANT: When context data is provided, always ground your answers in it. Do not invent business names or statistics.`;

// ─── Build context string to inject into the system prompt ───────────────────
function formatContext(ctx: AIContext): string {
  const lines: string[] = [
    "[CONTEXT DATA — live from Verso Air database]",
    `Total businesses: ${ctx.totalBusinesses.toLocaleString()}`,
    `Active businesses: ${ctx.activeBusinesses.toLocaleString()}`,
    `Sectors: ${ctx.categories.map((c) => `${c.name} (${c.count})`).join(", ")}`,
    `Countries with listings: ${ctx.countries.map((c) => `${c.name} (${c.count})`).join(", ")}`,
  ];

  if (ctx.searchResults && ctx.searchResults.length > 0) {
    lines.push("Matching businesses found:");
    for (const b of ctx.searchResults) {
      const rating = b.rating != null ? ` ★${b.rating.toFixed(1)}` : "";
      lines.push(
        `  • ${b.name} | ${b.category} | ${b.location || b.country}${rating}${b.description ? " — " + b.description : ""}`,
      );
    }
  } else if (
    ctx.searchResults !== undefined &&
    ctx.searchResults.length === 0
  ) {
    lines.push("No matching businesses found in database for this query.");
  }

  lines.push("[/CONTEXT DATA]");
  return lines.join("\n");
}

// ─── Ollama call ──────────────────────────────────────────────────────────────
async function callOllama(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 512,
        top_p: 0.9,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama responded with ${res.status}`);
  }

  const data = (await res.json()) as Record<string, any>;
  const content: string = data?.message?.content ?? data?.response ?? "";

  if (!content) throw new Error("Ollama returned empty content");
  return content.trim();
}

// ─── Smart conversational fallback (no LLM required, uses real DB data) ──────
function smartFallback(
  userMessage: string,
  ctx: AIContext,
  conversationHistory: ChatMessage[],
): string {
  const msg = userMessage.toLowerCase().trim();

  // ── Identity / about VersoAI ──
  if (
    /who are you|what are you|your name|what('s| is) your|tell me about you|introduce yourself/.test(
      msg,
    )
  ) {
    return (
      `I'm **VersoAI** 🤖 — the intelligent assistant built into the Verso Air platform.\n\n` +
      `I can:\n` +
      `• 🔍 Search **${ctx.totalBusinesses.toLocaleString()} businesses** across **${ctx.countries.length} countries**\n` +
      `• 📊 Give you live analytics and stats\n` +
      `• ✍️ Help write professional business descriptions\n` +
      `• 🏷️ Suggest the right sector/category for a business\n` +
      `• 🌍 Answer questions about any country in the directory\n\n` +
      `I'm currently running in **smart mode** (rule-based). For full conversational AI, install Ollama on your machine and I'll upgrade automatically!`
    );
  }

  // ── Greetings ──
  if (
    /^(hi|hello|hey|bonjour|salut|hola|ciao|yo|sup|what'?s up|howdy|good (morning|afternoon|evening))\b/.test(
      msg,
    )
  ) {
    const greetings = [
      `Hello! 👋 I'm **VersoAI**. I have live access to **${ctx.totalBusinesses.toLocaleString()} businesses** across **${ctx.countries.length} countries**. How can I help you today?`,
      `Hey there! 👋 Welcome to Verso Air. I'm VersoAI — ask me anything about our **${ctx.totalBusinesses.toLocaleString()} business listings** or the platform features!`,
      `Hi! 🌟 I'm VersoAI, your Verso Air assistant. What would you like to explore today?`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // ── Farewells ──
  if (
    /^(bye|goodbye|see you|later|adieu|ciao|take care|thanks? bye|au revoir|gotta go|ttyl)\b/.test(
      msg,
    )
  ) {
    return `Goodbye! 👋 Feel free to come back anytime. I'll be here with live data from Verso Air. Take care! 🌟`;
  }

  // ── Thank you ──
  if (
    /^(thanks|thank you|thx|merci|ty|appreciate|great|awesome|perfect|cool|nice|wonderful|excellent)\b/.test(
      msg,
    )
  ) {
    const replies = [
      `You're welcome! 😊 Let me know if there's anything else I can help with.`,
      `Glad I could help! 🙌 Feel free to ask anything else about Verso Air.`,
      `Happy to help! Is there anything else you'd like to know?`,
      `Anytime! 💙 I'm here if you need more info.`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── How are you / small talk ──
  if (
    /how are you|how('s| is) it going|how do you do|you good|you doing|ça va/.test(
      msg,
    )
  ) {
    return `I'm running great! ⚡ Currently connected to **${ctx.totalBusinesses.toLocaleString()} businesses** in the database. What can I help you with today?`;
  }

  // ── Compliments / humor ──
  if (
    /you('re| are) (smart|cool|amazing|great|awesome|good|helpful|the best)|love you|like you|impressive/.test(
      msg,
    )
  ) {
    return `Thanks, that means a lot! 😄 I'm always learning. Let me know how I can keep being useful to you!`;
  }

  // ── What can you do ──
  if (
    /what (can|do) you do|your (capabilities|abilities|skills)|what are your|how can you help/.test(
      msg,
    )
  ) {
    return (
      `Here's everything I can do for you:\n\n` +
      `🔍 **Search** — Find businesses by name, sector, or country\n` +
      `📊 **Analytics** — Live stats on the entire platform\n` +
      `✍️ **Descriptions** — Help write professional listing text\n` +
      `🏷️ **Categories** — Suggest the right sector for a business\n` +
      `📍 **Country Info** — Browse listings by country\n` +
      `🚀 **Platform Guide** — Explain features like verification, reservations, etc.\n\n` +
      `Just ask naturally — I'll understand!`
    );
  }

  // ── Yes / affirmative (follow-up awareness) ──
  if (
    /^(yes|yeah|yep|yea|sure|ok|okay|go ahead|do it|please|absolutely|definitely|of course|alright)\b/.test(
      msg,
    )
  ) {
    // Check if there was a previous assistant message offering options
    const lastAssistant = [...conversationHistory]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistant) {
      // If the last message offered a search or breakdown
      if (
        /search|find|show|list|browse/.test(lastAssistant.content.toLowerCase())
      ) {
        return `What specifically would you like me to search for? You can say something like *"Find restaurants in Paris"* or *"Show me hotels"*.`;
      }
      if (
        /breakdown|deeper|sector|details/.test(
          lastAssistant.content.toLowerCase(),
        )
      ) {
        const topCats = ctx.categories
          .slice(0, 5)
          .map((c) => `**${c.name}**: ${c.count}`)
          .join(" | ");
        return `Here's a quick breakdown:\n\n**Top Sectors:** ${topCats}\n\nWant me to drill into a specific one?`;
      }
    }
    return `Sure! What would you like me to do? I can search for businesses, show analytics, help with descriptions, or explain platform features.`;
  }

  // ── No / negative ──
  if (
    /^(no|nah|nope|not really|never mind|nevermind|nothing|forget it|cancel)\b/.test(
      msg,
    )
  ) {
    return `No problem! 😊 I'm here whenever you need me. Just ask away!`;
  }

  // ── Opinions / preferences (conversational) ──
  if (
    /what do you think|your opinion|recommend|suggest|best|which (one|should)|advise/.test(
      msg,
    )
  ) {
    if (/country|where|location|place/.test(msg)) {
      const top3 = ctx.countries
        .slice(0, 3)
        .map((c) => `**${c.name}** (${c.count} listings)`)
        .join(", ");
      return `Based on our data, the most active countries are: ${top3}.\n\nWant me to search for something specific in any of these?`;
    }
    if (/sector|category|business|industry/.test(msg)) {
      const top3 = ctx.categories
        .slice(0, 3)
        .map((c) => `**${c.name}** (${c.count})`)
        .join(", ");
      return `Our strongest sectors are: ${top3}.\n\nI can help you explore any of them — just ask!`;
    }
    return `I'd love to help you decide! Could you give me a bit more context? For example, are you looking for a specific type of business, country, or platform feature?`;
  }

  // ── Analytics / stats questions ──
  if (
    /statistic|analytic|how many|count|data|number|total|report|stats|overview|summary/.test(
      msg,
    )
  ) {
    const topCats = ctx.categories
      .slice(0, 5)
      .map((c) => `**${c.name}**: ${c.count}`)
      .join(" | ");
    const topCountries = ctx.countries
      .slice(0, 5)
      .map((c) => `${c.name} (${c.count})`)
      .join(", ");
    return (
      `📊 **Verso Air Platform Stats**\n\n` +
      `• **Total businesses:** ${ctx.totalBusinesses.toLocaleString()}\n` +
      `• **Active:** ${ctx.activeBusinesses.toLocaleString()}\n\n` +
      `**Top Sectors:** ${topCats}\n\n` +
      `**Most Active Countries:** ${topCountries}\n\n` +
      `Ask me about a specific country or sector for a deeper breakdown!`
    );
  }

  // ── Search results available ──
  if (ctx.searchResults && ctx.searchResults.length > 0) {
    const list = ctx.searchResults
      .map((b, i) => {
        const rating = b.rating != null ? ` ★${b.rating.toFixed(1)}` : "";
        return `${i + 1}. **${b.name}** — ${b.category} | ${b.location || b.country}${rating}`;
      })
      .join("\n");
    return `Here's what I found in the database:\n\n${list}\n\nWant to refine this search or see more details about any of these?`;
  }

  // ── No search results for an explicit search ──
  if (
    ctx.searchResults !== undefined &&
    ctx.searchResults.length === 0 &&
    /find|search|show|list|look/.test(msg)
  ) {
    return (
      `I searched the database but found no matching businesses for that query.\n\n` +
      `Try a broader search, or ask me: *"What sectors are available?"* to browse all **${ctx.totalBusinesses.toLocaleString()} listings**.`
    );
  }

  // ── Category questions ──
  if (/categor|sector|type|industry|kind of business/.test(msg)) {
    const cats = ctx.categories
      .map((c) => `**${c.name}** (${c.count} listings)`)
      .join(", ");
    return (
      `🏷️ **Verso Air Sectors:**\n\n${cats}\n\n` +
      `Describe your business and I'll suggest the best category for it!`
    );
  }

  // ── Description generation ──
  if (
    /description|write|generate|draft|help me write|copywriting|listing text/.test(
      msg,
    )
  ) {
    return (
      `📝 **Business Description Generator**\n\n` +
      `Tell me about your business and I'll write a professional listing description!\n\n` +
      `Share:\n` +
      `1. **Business name**\n` +
      `2. **Products or services offered**\n` +
      `3. **Your target customers**\n` +
      `4. **City / country**\n\n` +
      `I'll craft something compelling for your directory profile.`
    );
  }

  // ── Platform features / help ──
  if (
    /feature|what can (the|this)|platform|verify|verif|reserv|geo admin|dashboard|artist|portal|booking/.test(
      msg,
    )
  ) {
    return (
      `🚀 **Verso Air Features:**\n\n` +
      `• **Business Directory** — 8+ sector pages with live search & filters\n` +
      `• **Reservations** — Book services directly through the platform\n` +
      `• **Business Verification** ✅ — Get a verified badge for your listing\n` +
      `• **Geo Admin** — Location-based management (subscriber feature)\n` +
      `• **Analytics Dashboard** — Revenue & performance KPIs\n` +
      `• **Artist Portal** — Dedicated profiles for cultural sector\n\n` +
      `What would you like to explore?`
    );
  }

  // ── Country-specific question ──
  const mentionedCountry = ctx.countries.find((c) =>
    msg.includes(c.name.toLowerCase()),
  );
  if (mentionedCountry) {
    return (
      `📍 **${mentionedCountry.name}** has **${mentionedCountry.count} business listings** on Verso Air.\n\n` +
      `Would you like me to:\n` +
      `• Search for a specific type of business there?\n` +
      `• Show you the top-rated listings?\n` +
      `• Give you a sector breakdown for that country?`
    );
  }

  // ── General question (who/what/when/where/why) — conversational catch-all ──
  if (
    /^(who|what|when|where|why|is|are|can|will|would|should|does|do|did|has|have|could)\b/.test(
      msg,
    )
  ) {
    // Verso-related question
    if (/verso|platform|site|website|app|this/.test(msg)) {
      return (
        `Great question! **Verso Air** is a multi-sector business intelligence platform.\n\n` +
        `It hosts **${ctx.totalBusinesses.toLocaleString()} businesses** across **${ctx.countries.length} countries**, covering sectors like Commerce, Hospitality, Construction, Automotive, Finance, Entertainment, and more.\n\n` +
        `What specific aspect would you like to know more about?`
      );
    }
    // General knowledge — be honest about limitations
    return (
      `That's an interesting question! 🤔 I'm specialized in helping with **Verso Air's business directory and platform** — so I'm best at:\n\n` +
      `• Searching businesses & providing analytics\n` +
      `• Describing and categorizing businesses\n` +
      `• Navigating platform features\n\n` +
      `For full conversational AI on any topic, install **Ollama** and I'll upgrade to a real language model automatically. Want to know how?`
    );
  }

  // ── Ollama / upgrade questions ──
  if (
    /ollama|upgrade|install|full (mode|ai|model)|language model|llm|download|better ai/.test(
      msg,
    )
  ) {
    return (
      `🧠 **Upgrade to Full AI Mode with Ollama**\n\n` +
      `Ollama is a free, open-source app that runs AI models locally on your Mac — no cloud, no API costs.\n\n` +
      `**Setup (takes ~2 minutes):**\n` +
      `1. Download from **ollama.com** or run: \`brew install ollama\`\n` +
      `2. Pull a model: \`ollama pull llama3.2\`\n` +
      `3. Start it: \`ollama serve\`\n\n` +
      `Once running, I'll automatically connect and can:\n` +
      `• Hold **real conversations** on any topic\n` +
      `• Write **detailed descriptions** with creative flair\n` +
      `• Provide **deeper analysis** of business data\n` +
      `• Understand complex multi-part questions\n\n` +
      `Everything stays on your machine — 100% private! 🔒`
    );
  }

  // ── Default — still conversational, not robotic ──
  return (
    `I hear you! I'm not sure I fully understood that one. 😅\n\n` +
    `I'm **VersoAI** — I work best with questions about Verso Air's **${ctx.totalBusinesses.toLocaleString()} business listings** across **${ctx.countries.length} countries**.\n\n` +
    `Try something like:\n` +
    `• *"Find restaurants in Morocco"*\n` +
    `• *"How many businesses are listed?"*\n` +
    `• *"What sectors are available?"*\n` +
    `• *"Tell me about yourself"*\n\n` +
    `Or install **Ollama** for full conversational AI — ask *"How do I upgrade?"*`
  );
}

// ─── Main exported function ───────────────────────────────────────────────────
/**
 * Processes a conversation and returns an AI reply.
 * Tries Ollama first (self-hosted, free), falls back to smart rule-based if unavailable.
 */
export async function chat(messages: ChatMessage[]): Promise<ChatResult> {
  // Get the last user message for context building
  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Build real database context
  let ctx: AIContext;
  try {
    ctx = await buildAIContext(lastUserMsg);
  } catch (err) {
    console.warn("[VersoAI] Context build failed, using empty context:", err);
    ctx = {
      totalBusinesses: 0,
      activeBusinesses: 0,
      categories: [],
      countries: [],
    };
  }

  // Inject context into the system prompt
  const systemMessage: ChatMessage = {
    role: "system",
    content: SYSTEM_PROMPT + "\n\n" + formatContext(ctx),
  };

  // Build the full message list for LLM (system + last 12 conversation turns)
  const llmMessages: ChatMessage[] = [systemMessage, ...messages.slice(-12)];

  // ── Try Ollama ──
  try {
    const reply = await callOllama(llmMessages);
    console.log("[VersoAI] Ollama responded successfully");
    return { reply, provider: "ollama" };
  } catch (err: any) {
    console.warn(
      "[VersoAI] Ollama unavailable, using smart fallback:",
      err?.message ?? err,
    );
  }

  // ── Smart fallback ──
  const reply = smartFallback(lastUserMsg, ctx, messages);
  return { reply, provider: "fallback" };
}

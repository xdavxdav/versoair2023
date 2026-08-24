/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — SHARED INTENT PARSER (God-Tier Brain)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Parses raw natural language into structured intent objects.
 * Powers both the home.tsx AI search and the VersoAI chat widget.
 *
 * Example:
 *   "My basement is flooded in Montreal"
 *   → { sector: "batiment", urgency: 10, location: "Montreal", action: "emergency_blast" }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntentContext {
  sector: string | null; // Matched sector slug (batiment, commerce, hotellerie, etc.)
  sectorLabel: string | null; // Human-readable label ("Construction / Plumbing")
  urgency: number; // 0-10 (0 = browsing, 10 = life-threatening emergency)
  location: string | null; // Detected city/region/country
  countryCode: string | null; // ISO 2-letter if detected
  action: string; // "search" | "emergency_blast" | "comparison" | "info"
  keywords: string[]; // Extracted meaningful keywords
  language: "en" | "fr" | "es" | "other";
  confidence: number; // 0-1 how confident we are in the parse
  rawQuery: string;
}

// ─── Sector Mappings (covers 32+ categories) ─────────────────────────────────

const SECTOR_PATTERNS: Array<{
  slug: string;
  label: string;
  patterns: RegExp;
  urgencyBoost?: number;
}> = [
  // Construction / Building
  {
    slug: "batiment",
    label: "Construction / Bâtiment",
    patterns:
      /\b(flood|plumb|roof|leak|pipe|burst|construct|build|contractor|electrician|electric|wir(ing|e)|hvac|heat|cool|renovate|renovation|repair|fix|handyman|carpenter|mason|concrete|demolition|foundation|insulation|plombier|toiture|fuite|tuyau|maçon|charpentier|rénovation)\b/i,
    urgencyBoost: 3,
  },
  // Metalworking / metallurgy
  {
    slug: "metallurgie",
    label: "Métallurgie / Travail des métaux",
    patterns:
      /\b(metal(?:lurgy|working)?|metallurgy|steel|foundry|forge|forging|welding|welder|fabrication|machining|metalwork|métallurgie|métallurgique|acier|fonderie|forge|soudure|soudeur|usinage|métal)\b/i,
  },
  // Hospitality / Hotels
  {
    slug: "hotellerie",
    label: "Hôtellerie / Tourisme",
    patterns:
      /\b(hotel|motel|hostel|resort|guesthouse|inn|lodge|b&b|bed and breakfast|accommodation|tourism|travel|booking|reservation|room|suite|check.?in|hébergement|auberge|chambre|séjour|tourisme|voyage)\b/i,
  },
  // Commerce / Retail
  {
    slug: "commerce",
    label: "Commerce / Retail",
    patterns:
      /\b(shop|store|retail|supermarket|mall|market|grocery|boutique|warehouse|wholesale|distributor|vendor|merchant|e-commerce|magasin|épicerie|marché|vente|achat|commerce|détail)\b/i,
  },
  // Automotive
  {
    slug: "automobile",
    label: "Automobile",
    patterns:
      /\b(car|auto|vehicle|mechanic|garage|dealership|motor|tire|brake|transmission|body shop|oil change|tow|towing|accident|collision|voiture|garagiste|pneu|frein|vidange|remorquage|carrosserie|concessionnaire)\b/i,
    urgencyBoost: 2,
  },
  // Finance
  {
    slug: "finances",
    label: "Finance / Banque",
    patterns:
      /\b(bank|finance|loan|mortgage|insurance|invest|credit|debit|tax|accounting|accountant|cpa|audit|broker|fund|wealth|fintech|banque|prêt|hypothèque|assurance|comptable|impôt|crédit)\b/i,
  },
  // Entertainment
  {
    slug: "divertissement",
    label: "Divertissement / Entertainment",
    patterns:
      /\b(entertain|concert|festival|cinema|movie|theater|theatre|nightclub|bar|lounge|karaoke|dj|live music|event|show|spectacle|musique|cinéma|discothèque|soirée|fête|bowling|arcade|amusement)\b/i,
  },
  // Healthcare
  {
    slug: "sante",
    label: "Santé / Healthcare",
    patterns:
      /\b(doctor|hospital|clinic|medical|health|dentist|dental|pharmacy|emergency|urgent care|ambulance|nurse|surgeon|therapy|therapist|mental health|psycholog|psychiatr|eye|optometrist|médecin|hôpital|clinique|pharmacie|urgence|dentiste|santé|infirmier)\b/i,
    urgencyBoost: 4,
  },
  // Food & Beverage / Restaurant
  {
    slug: "restauration",
    label: "Restauration / Food",
    patterns:
      /\b(restaurant|cafe|coffee|pizza|sushi|burger|food|catering|bakery|pastry|bistro|brasserie|fast food|delivery|takeout|traiteur|boulangerie|pâtisserie|cuisine|repas|livraison)\b/i,
  },
  // Legal / Professional Services
  {
    slug: "services-professionnels",
    label: "Services Professionnels",
    patterns:
      /\b(lawyer|attorney|legal|notary|consultant|advisor|counsel|court|litigation|divorce|immigration|patent|trademark|avocat|notaire|juridique|conseiller|tribunal|litige)\b/i,
  },
  // Real Estate
  {
    slug: "immobilier",
    label: "Immobilier / Real Estate",
    patterns:
      /\b(real estate|property|apartment|house|rent|lease|buy home|sell home|condo|loft|realtor|agent|land|terrain|appartement|maison|louer|acheter|vendre|logement|immobilier)\b/i,
  },
  // Education & Training
  {
    slug: "education",
    label: "Éducation / Formation",
    patterns:
      /\b(school|university|college|course|training|tutor|teacher|learn|education|academy|certification|diploma|degree|études|école|université|formation|cours|apprentissage|enseignement)\b/i,
  },
  // Technology / IT
  {
    slug: "technologie",
    label: "Technologie / IT",
    patterns:
      /\b(software|tech|it support|computer|website|web design|app|developer|programmer|hosting|cloud|cyber|data|server|network|internet|informatique|développeur|hébergement|réseau|logiciel)\b/i,
  },
  // Transportation / Logistics
  {
    slug: "transport",
    label: "Transport / Logistique",
    patterns:
      /\b(transport|shipping|delivery|courier|freight|logistics|moving|movers|truck|cargo|taxi|uber|chauffeur|bus|train|avion|déménagement|livraison|camion|logistique|expédition)\b/i,
  },
  // Beauty & Wellness
  {
    slug: "beaute",
    label: "Beauté / Wellness",
    patterns:
      /\b(salon|spa|beauty|hair|nail|massage|facial|skincare|barber|stylist|makeup|wax|tattoo|piercing|coiffure|esthétique|manucure|maquillage|bien-être)\b/i,
  },
  // Agriculture
  {
    slug: "agriculture",
    label: "Agriculture / Agri-food",
    patterns:
      /\b(farm|agriculture|crop|livestock|organic|harvest|seed|fertilizer|irrigation|ranch|dairy|poultry|ferme|élevage|récolte|bio|culture|semence)\b/i,
  },
];

// ─── Emergency keywords (boost urgency significantly) ─────────────────────────

const EMERGENCY_PATTERNS =
  /\b(emergency|urgent|help|sos|flooded|fire|broken|burst|leak|accident|injured|stuck|locked out|gas leak|power out|no (water|heat|power|electric)|urgence|secours|inondation|incendie|accident|cassé|fuite de gaz|panne)\b/i;

const HIGH_URGENCY_PATTERNS =
  /\b(asap|right now|immediately|today|tonight|fast|quick|rapid|soon|hurry|tout de suite|maintenant|vite|rapidement|pressé|dépêchez)\b/i;

// ─── Location extraction ──────────────────────────────────────────────────────

const MAJOR_CITIES: Record<string, string> = {
  // Canada
  montreal: "CA",
  toronto: "CA",
  vancouver: "CA",
  ottawa: "CA",
  calgary: "CA",
  edmonton: "CA",
  winnipeg: "CA",
  quebec: "CA",
  halifax: "CA",
  laval: "CA",
  // France
  paris: "FR",
  lyon: "FR",
  marseille: "FR",
  toulouse: "FR",
  nice: "FR",
  nantes: "FR",
  strasbourg: "FR",
  bordeaux: "FR",
  lille: "FR",
  rennes: "FR",
  // USA
  "new york": "US",
  "los angeles": "US",
  chicago: "US",
  houston: "US",
  phoenix: "US",
  miami: "US",
  atlanta: "US",
  boston: "US",
  seattle: "US",
  dallas: "US",
  detroit: "US",
  denver: "US",
  "san francisco": "US",
  // Africa
  abidjan: "CI",
  dakar: "SN",
  lagos: "NG",
  accra: "GH",
  nairobi: "KE",
  "dar es salaam": "TZ",
  kinshasa: "CD",
  douala: "CM",
  yaoundé: "CM",
  casablanca: "MA",
  tunis: "TN",
  algiers: "DZ",
  cairo: "EG",
  johannesburg: "ZA",
  "cape town": "ZA",
  addis: "ET",
  kampala: "UG",
  bamako: "ML",
  conakry: "GN",
  lomé: "TG",
  cotonou: "BJ",
  niamey: "NE",
  ouagadougou: "BF",
  libreville: "GA",
  brazzaville: "CG",
  luanda: "AO",
  maputo: "MZ",
  lusaka: "ZM",
  harare: "ZW",
  antananarivo: "MG",
  // Caribbean
  "port-au-prince": "HT",
  kingston: "JM",
  "santo domingo": "DO",
  // Europe
  london: "GB",
  berlin: "DE",
  madrid: "ES",
  rome: "IT",
  amsterdam: "NL",
  brussels: "BE",
  zurich: "CH",
  geneva: "CH",
  lisbon: "PT",
  vienna: "AT",
  // Middle East
  dubai: "AE",
  doha: "QA",
  riyadh: "SA",
};

// ─── Language detection ───────────────────────────────────────────────────────

function detectLanguage(text: string): "en" | "fr" | "es" | "other" {
  const fr =
    /\b(je|mon|ma|mes|nous|vous|dans|pour|avec|est|sont|les|des|une|cherche|trouver|besoin|près|chez|où)\b/i;
  const es =
    /\b(yo|mi|mis|nosotros|busco|necesito|cerca|donde|para|con|estoy|están|los|las|una)\b/i;
  if (fr.test(text)) return "fr";
  if (es.test(text)) return "es";
  return "en";
}

// ─── AI-Powered Parse (Groq/Ollama) ──────────────────────────────────────────

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const INTENT_PROMPT = `You are an intent parser for a business directory platform. Given a user query, extract:
- sector: one of [batiment, hotellerie, commerce, automobile, finances, divertissement, sante, restauration, services-professionnels, immobilier, education, technologie, transport, beaute, agriculture] or null
- urgency: 0-10 (0=browsing, 5=need soon, 8=urgent, 10=emergency)
- location: city/region name or null
- countryCode: ISO 2-letter code or null
- action: one of [search, emergency_blast, comparison, info]
- keywords: array of 2-5 key search terms

Respond ONLY with valid JSON, no explanation. Example:
{"sector":"batiment","urgency":10,"location":"Montreal","countryCode":"CA","action":"emergency_blast","keywords":["flooded","basement","plumber"]}`;

async function aiParse(query: string): Promise<Partial<IntentContext> | null> {
  const messages = [
    { role: "system", content: INTENT_PROMPT },
    { role: "user", content: query },
  ];

  // Try Groq first (faster for intent parsing — ~0.5s)
  if (GROQ_API_KEY) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.1,
            max_tokens: 200,
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as any;
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return parsed;
        }
      }
    } catch (e) {
      // Groq failed — try Ollama
    }
  }

  // Try Ollama (local, free)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        format: "json",
        options: { temperature: 0.1, num_predict: 200 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      const content = data?.message?.content ?? data?.response;
      if (content) {
        const parsed = JSON.parse(content);
        return parsed;
      }
    }
  } catch {
    // Ollama unavailable
  }

  return null; // fallback to rule-based
}

// ─── Rule-Based Parse (instant, no LLM needed) ──────────────────────────────

function ruleParse(query: string): IntentContext {
  const lower = query.toLowerCase().trim();
  const language = detectLanguage(lower);
  let sector: string | null = null;
  let sectorLabel: string | null = null;
  let urgency = 3; // default: moderate interest
  let location: string | null = null;
  let countryCode: string | null = null;
  let action: string = "search";
  const keywords: string[] = [];

  // ── Detect sector ──
  for (const sp of SECTOR_PATTERNS) {
    if (sp.patterns.test(lower)) {
      sector = sp.slug;
      sectorLabel = sp.label;
      if (sp.urgencyBoost) urgency += sp.urgencyBoost;
      break;
    }
  }

  // ── Detect urgency boosters ──
  if (EMERGENCY_PATTERNS.test(lower)) {
    urgency = Math.min(10, urgency + 4);
    action = "emergency_blast";
  }
  if (HIGH_URGENCY_PATTERNS.test(lower)) {
    urgency = Math.min(10, urgency + 2);
  }

  // ── Detect location ──
  for (const [city, code] of Object.entries(MAJOR_CITIES)) {
    if (lower.includes(city)) {
      location = city.charAt(0).toUpperCase() + city.slice(1);
      countryCode = code;
      break;
    }
  }

  // ── Extract keywords ──
  const stopWords = new Set([
    "i",
    "my",
    "me",
    "the",
    "a",
    "an",
    "is",
    "in",
    "on",
    "at",
    "to",
    "for",
    "and",
    "or",
    "of",
    "with",
    "need",
    "want",
    "looking",
    "find",
    "search",
    "show",
    "get",
    "near",
    "best",
    "good",
    "top",
    "je",
    "mon",
    "ma",
    "un",
    "une",
    "dans",
    "pour",
    "avec",
    "cherche",
    "trouver",
    "besoin",
    "près",
  ]);
  const words = lower.match(/\b[a-zàâéèêëïîôùûüç]{3,}\b/g) ?? [];
  for (const w of words) {
    if (!stopWords.has(w) && keywords.length < 5) {
      keywords.push(w);
    }
  }

  // ── Set action based on urgency ──
  if (urgency >= 8) action = "emergency_blast";
  else if (urgency <= 2) action = "comparison";

  // ── Confidence calculation ──
  let confidence = 0.5;
  if (sector) confidence += 0.2;
  if (location) confidence += 0.15;
  if (urgency !== 3) confidence += 0.1;
  confidence = Math.min(1, confidence);

  return {
    sector,
    sectorLabel,
    urgency: Math.min(10, Math.max(0, urgency)),
    location,
    countryCode,
    action,
    keywords,
    language,
    confidence,
    rawQuery: query,
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Parse a raw natural language query into a structured IntentContext.
 * Tries AI (Groq/Ollama) first for higher accuracy, falls back to rule-based.
 */
export async function parseUserIntent(query: string): Promise<IntentContext> {
  if (!query || query.trim().length < 2) {
    return {
      sector: null,
      sectorLabel: null,
      urgency: 0,
      location: null,
      countryCode: null,
      action: "info",
      keywords: [],
      language: "en",
      confidence: 0,
      rawQuery: query,
    };
  }

  // Always do rule-based first (instant) as baseline
  const ruleResult = ruleParse(query);

  // If query is short or simple, rule-based is sufficient
  if (query.trim().split(/\s+/).length <= 4 && ruleResult.confidence >= 0.7) {
    return ruleResult;
  }

  // Try AI parse for complex queries
  try {
    const aiResult = await aiParse(query);
    if (aiResult) {
      // Merge AI result with rule-based (AI overrides where it has values)
      return {
        sector: aiResult.sector ?? ruleResult.sector,
        sectorLabel: aiResult.sector
          ? (SECTOR_PATTERNS.find((s) => s.slug === aiResult.sector)?.label ??
            ruleResult.sectorLabel)
          : ruleResult.sectorLabel,
        urgency: aiResult.urgency ?? ruleResult.urgency,
        location: aiResult.location ?? ruleResult.location,
        countryCode: aiResult.countryCode ?? ruleResult.countryCode,
        action: aiResult.action ?? ruleResult.action,
        keywords: aiResult.keywords?.length
          ? aiResult.keywords
          : ruleResult.keywords,
        language: ruleResult.language, // rule-based is fine for this
        confidence: Math.min(1, ruleResult.confidence + 0.3), // AI boosts confidence
        rawQuery: query,
      };
    }
  } catch (err) {
    console.warn("[IntentParser] AI parse failed, using rule-based:", err);
  }

  return ruleResult;
}

/**
 * Quick sync parse (rule-based only, no network calls).
 * Use for instant UI feedback while AI parse runs in background.
 */
export function parseUserIntentSync(query: string): IntentContext {
  return ruleParse(query);
}

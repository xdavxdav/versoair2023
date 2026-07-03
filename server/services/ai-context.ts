import { pool } from "../db";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AISearchResult {
  name: string;
  category: string;
  location: string;
  country: string;
  description: string;
  rating: number | null;
  relevance?: number;
}

export interface AIContext {
  totalBusinesses: number;
  activeBusinesses: number;
  categories: { name: string; slug: string; count: number }[];
  countries: { name: string; code: string; count: number }[];
  searchResults?: AISearchResult[];
  searchMethod?: "fulltext" | "ilike" | "filter";
  searchQuery?: string;
}

// ─── Role → allowed sector mapping (Identity-Based Access Control) ────────────
const ROLE_SECTOR_ACCESS: Record<string, string[] | "*"> = {
  superuser: "*",
  admin: "*",
  moderator: "*",
  business_owner: "*",
  user: "*",
  // Extend with sector-restricted roles:
  // manager_commerce: ["commerce"],
  // manager_hotellerie: ["hotellerie"],
  // analyst_finance: ["finances"],
};

/**
 * Returns the list of sector slugs a given role can access.
 * Returns null if the role has access to all sectors.
 */
export function getAllowedSectors(role?: string): string[] | null {
  if (!role) return null; // unauthenticated → all public data
  const access = ROLE_SECTOR_ACCESS[role];
  if (!access || access === "*") return null; // full access
  return access;
}

// ─── Sector alias mapping ─────────────────────────────────────────────────────
const SECTOR_ALIASES: Record<string, string> = {
  restaurant: "commerce",
  food: "commerce",
  hotel: "hotellerie",
  hospitality: "hotellerie",
  accommodation: "hotellerie",
  construction: "batiment",
  building: "batiment",
  contractor: "batiment",
  car: "automobile",
  auto: "automobile",
  vehicle: "automobile",
  finance: "finances",
  bank: "finances",
  entertainment: "divertissement",
  music: "divertissement",
  health: "sante",
  clinic: "sante",
  doctor: "sante",
};

/**
 * Builds real-time database context to inject into the AI's prompt.
 * Analyzes the user message to decide what data is relevant.
 * Supports full-text search (PostgreSQL tsvector), identity-based access control,
 * and relevance ranking for grounded AI responses.
 */
export async function buildAIContext(
  userMessage: string,
  userRole?: string,
): Promise<AIContext> {
  const msg = userMessage.toLowerCase();
  const allowedSectors = getAllowedSectors(userRole);

  // Always fetch platform-wide stats + categories + countries in parallel
  const [statsRes, categoriesRes, countriesRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS active
      FROM businesses
    `),
    pool.query(`
      SELECT bc.name, bc.slug, COUNT(b.id) AS count
      FROM business_categories bc
      LEFT JOIN businesses b ON b.category_id = bc.id
      GROUP BY bc.id, bc.name, bc.slug
      ORDER BY count DESC
      LIMIT 12
    `),
    pool.query(`
      SELECT c.name, c.code, COUNT(b.id) AS count
      FROM countries c
      LEFT JOIN businesses b ON b.country_id = c.id
      GROUP BY c.id, c.name, c.code
      ORDER BY count DESC
      LIMIT 20
    `),
  ]);

  const context: AIContext = {
    totalBusinesses: parseInt(statsRes.rows[0]?.total ?? "0"),
    activeBusinesses: parseInt(statsRes.rows[0]?.active ?? "0"),
    categories: categoriesRes.rows.map((r) => ({
      name: r.name,
      slug: r.slug,
      count: parseInt(r.count),
    })),
    countries: countriesRes.rows.map((r) => ({
      name: r.name,
      code: r.code,
      count: parseInt(r.count),
    })),
  };

  // Detect if the user is asking to search / find / list businesses
  const isSearchIntent =
    /find|search|show|list|give me|display|qui fait|trouver|chercher|restaurant|hotel|contractor|shop|garage|clinic|lawyer|doctor/i.test(
      msg,
    );

  if (isSearchIntent) {
    const params: (string | number)[] = [];
    let whereClause = "WHERE b.is_active = true";
    let orderClause = "ORDER BY b.rating DESC NULLS LAST";
    let searchMethod: "fulltext" | "ilike" | "filter" = "filter";
    let selectExtra = "";

    // ── Identity-Based Access Control: restrict to allowed sectors ──
    if (allowedSectors && allowedSectors.length > 0) {
      params.push(allowedSectors as any);
      whereClause += ` AND bc.slug = ANY($${params.length})`;
    }

    // Detect country mentions
    const mentionedCountry = context.countries.find(
      (c) =>
        msg.includes(c.name.toLowerCase()) ||
        msg.includes(c.code.toLowerCase()),
    );
    if (mentionedCountry) {
      params.push(mentionedCountry.code);
      whereClause += ` AND c.code = $${params.length}`;
    }

    // Detect category / sector mentions
    const mentionedCategory = context.categories.find((cat) =>
      msg.includes(cat.name.toLowerCase()),
    );

    let targetSlug =
      mentionedCategory?.slug ??
      Object.entries(SECTOR_ALIASES).find(([alias]) =>
        msg.includes(alias),
      )?.[1];

    if (targetSlug) {
      params.push(targetSlug);
      whereClause += ` AND bc.slug = $${params.length}`;
    }

    // ── Full-Text Search with PostgreSQL tsvector (replaces ILIKE) ──
    const keywords = msg.match(/\b[a-z]{4,}\b/g) ?? [];
    const stopWords = new Set([
      "find",
      "show",
      "list",
      "give",
      "search",
      "with",
      "near",
      "from",
      "that",
      "this",
      "what",
      "which",
      "have",
      "there",
      "about",
      "some",
      "best",
      "good",
      "want",
      "need",
      "looking",
      "dans",
      "pour",
      "avec",
      "les",
      "des",
      "une",
    ]);
    const meaningfulKeywords = keywords.filter(
      (k) =>
        !stopWords.has(k) &&
        k.length > 3 &&
        !mentionedCountry?.name.toLowerCase().includes(k) &&
        !Object.keys(SECTOR_ALIASES).includes(k),
    );

    if (meaningfulKeywords.length > 0 && !targetSlug && !mentionedCountry) {
      // Build a full-text search query string: word1 | word2 | word3
      const tsQuery = meaningfulKeywords.join(" | ");
      params.push(tsQuery);
      context.searchQuery = meaningfulKeywords.join(" ");

      // Use to_tsvector + to_tsquery for semantic full-text search with ranking
      whereClause += ` AND (
        to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.location, ''))
        @@ to_tsquery('simple', $${params.length})
      )`;
      selectExtra = `,
        ts_rank(
          to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.location, '')),
          to_tsquery('simple', $${params.length})
        ) AS relevance`;
      orderClause = "ORDER BY relevance DESC, b.rating DESC NULLS LAST";
      searchMethod = "fulltext";
    } else if (meaningfulKeywords.length > 0) {
      // When combined with sector/country filters, use ILIKE as supplementary
      const kw = meaningfulKeywords[0];
      params.push(`%${kw}%`);
      whereClause += ` AND (b.name ILIKE $${params.length} OR b.description ILIKE $${params.length})`;
      searchMethod = "ilike";
      context.searchQuery = kw;
    }

    try {
      const searchRes = await pool.query(
        `SELECT
          b.id,
          b.name,
          COALESCE(bc.name, 'General') AS category,
          COALESCE(b.location, '') AS location,
          COALESCE(c.name, '') AS country,
          COALESCE(LEFT(b.description, 150), '') AS description,
          b.rating${selectExtra}
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        LEFT JOIN countries c ON b.country_id = c.id
        ${whereClause}
        ${orderClause}
        LIMIT 8`,
        params,
      );
      context.searchResults = searchRes.rows.map((r) => ({
        name: r.name,
        category: r.category,
        location: r.location,
        country: r.country,
        description: r.description,
        rating: r.rating ? parseFloat(r.rating) : null,
        relevance: r.relevance ? parseFloat(r.relevance) : undefined,
      }));
      context.searchMethod = searchMethod;
    } catch (err) {
      console.warn(
        "[AIContext] Search query failed, falling back to ILIKE:",
        err,
      );
      // Fallback: simple ILIKE if tsvector fails (e.g. missing column)
      try {
        const fallbackKw = meaningfulKeywords[0] ?? userMessage.slice(0, 30);
        const fbRes = await pool.query(
          `SELECT
            b.name,
            COALESCE(bc.name, 'General') AS category,
            COALESCE(b.location, '') AS location,
            COALESCE(c.name, '') AS country,
            COALESCE(LEFT(b.description, 150), '') AS description,
            b.rating
          FROM businesses b
          LEFT JOIN business_categories bc ON b.category_id = bc.id
          LEFT JOIN countries c ON b.country_id = c.id
          WHERE b.is_active = true
            AND (b.name ILIKE $1 OR b.description ILIKE $1)
          ORDER BY b.rating DESC NULLS LAST
          LIMIT 8`,
          [`%${fallbackKw}%`],
        );
        context.searchResults = fbRes.rows.map((r) => ({
          name: r.name,
          category: r.category,
          location: r.location,
          country: r.country,
          description: r.description,
          rating: r.rating ? parseFloat(r.rating) : null,
        }));
        context.searchMethod = "ilike";
      } catch (_) {
        // Non-fatal — just omit search results
      }
    }
  }

  return context;
}

/**
 * Grounded search: retrieves relevant businesses strictly from the database
 * to anchor AI responses in real data (prevents hallucinations).
 * Returns sources alongside results for citation.
 */
export async function groundedSearch(
  question: string,
  userRole?: string,
): Promise<{
  results: AISearchResult[];
  sources: { id: number; name: string; snippet: string }[];
  searchMethod: string;
}> {
  const msg = question.toLowerCase();
  const allowedSectors = getAllowedSectors(userRole);

  // Extract meaningful search terms
  const keywords = msg.match(/\b[a-z]{4,}\b/g) ?? [];
  const stopWords = new Set([
    "what",
    "which",
    "where",
    "when",
    "how",
    "many",
    "much",
    "does",
    "have",
    "show",
    "tell",
    "find",
    "give",
    "search",
    "list",
    "about",
    "with",
    "from",
    "that",
    "this",
    "there",
    "some",
    "best",
    "good",
    "want",
    "need",
    "quels",
    "quel",
    "quelle",
    "quelles",
    "combien",
    "sont",
    "dans",
    "pour",
    "avec",
    "les",
    "des",
    "une",
  ]);
  const meaningfulKeywords = keywords.filter(
    (k) => !stopWords.has(k) && k.length > 3,
  );

  const params: any[] = [];
  let whereClause = "WHERE b.is_active = true";
  let selectExtra = "";
  let orderClause = "ORDER BY b.rating DESC NULLS LAST";
  let searchMethod = "filter";

  // Access control
  if (allowedSectors && allowedSectors.length > 0) {
    params.push(allowedSectors);
    whereClause += ` AND bc.slug = ANY($${params.length})`;
  }

  // Full-text search
  if (meaningfulKeywords.length > 0) {
    const tsQuery = meaningfulKeywords.join(" | ");
    params.push(tsQuery);
    whereClause += ` AND (
      to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.location, ''))
      @@ to_tsquery('simple', $${params.length})
    )`;
    selectExtra = `,
      ts_rank(
        to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.location, '')),
        to_tsquery('simple', $${params.length})
      ) AS relevance`;
    orderClause = "ORDER BY relevance DESC, b.rating DESC NULLS LAST";
    searchMethod = "fulltext";
  }

  try {
    const res = await pool.query(
      `SELECT
        b.id,
        b.name,
        COALESCE(bc.name, 'General') AS category,
        COALESCE(b.location, '') AS location,
        COALESCE(c.name, '') AS country,
        COALESCE(LEFT(b.description, 200), '') AS description,
        b.rating${selectExtra}
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      LEFT JOIN countries c ON b.country_id = c.id
      ${whereClause}
      ${orderClause}
      LIMIT 6`,
      params,
    );

    const results: AISearchResult[] = res.rows.map((r: any) => ({
      name: r.name,
      category: r.category,
      location: r.location,
      country: r.country,
      description: r.description,
      rating: r.rating ? parseFloat(r.rating) : null,
      relevance: r.relevance ? parseFloat(r.relevance) : undefined,
    }));

    const sources = res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      snippet:
        (r.description ?? "").substring(0, 120) +
        (r.description && r.description.length > 120 ? "…" : ""),
    }));

    return { results, sources, searchMethod };
  } catch {
    return { results: [], sources: [], searchMethod: "error" };
  }
}

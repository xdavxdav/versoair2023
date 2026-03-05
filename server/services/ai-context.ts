import { pool } from "../db";

export interface AIContext {
  totalBusinesses: number;
  activeBusinesses: number;
  categories: { name: string; slug: string; count: number }[];
  countries: { name: string; code: string; count: number }[];
  searchResults?: {
    name: string;
    category: string;
    location: string;
    country: string;
    description: string;
    rating: number | null;
  }[];
}

/**
 * Builds real-time database context to inject into the AI's prompt.
 * Analyzes the user message to decide what data is relevant.
 */
export async function buildAIContext(userMessage: string): Promise<AIContext> {
  const msg = userMessage.toLowerCase();

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

    // Also match common aliases
    const sectorAliases: Record<string, string> = {
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

    let targetSlug =
      mentionedCategory?.slug ??
      Object.entries(sectorAliases).find(([alias]) => msg.includes(alias))?.[1];

    if (targetSlug) {
      params.push(targetSlug);
      whereClause += ` AND bc.slug = $${params.length}`;
    }

    // Full-text / keyword fallback
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
    ]);
    const meaningfulKeyword = keywords.find(
      (k) =>
        !stopWords.has(k) &&
        k.length > 3 &&
        !mentionedCountry?.name.toLowerCase().includes(k),
    );

    if (meaningfulKeyword && !targetSlug && !mentionedCountry) {
      params.push(`%${meaningfulKeyword}%`);
      whereClause += ` AND (b.name ILIKE $${params.length} OR b.description ILIKE $${params.length})`;
    }

    try {
      const searchRes = await pool.query(
        `SELECT
          b.name,
          COALESCE(bc.name, 'General') AS category,
          COALESCE(b.location, '') AS location,
          COALESCE(c.name, '') AS country,
          COALESCE(LEFT(b.description, 120), '') AS description,
          b.rating
        FROM businesses b
        LEFT JOIN business_categories bc ON b.category_id = bc.id
        LEFT JOIN countries c ON b.country_id = c.id
        ${whereClause}
        ORDER BY b.rating DESC NULLS LAST
        LIMIT 6`,
        params,
      );
      context.searchResults = searchRes.rows.map((r) => ({
        name: r.name,
        category: r.category,
        location: r.location,
        country: r.country,
        description: r.description,
        rating: r.rating ? parseFloat(r.rating) : null,
      }));
    } catch (_) {
      // Non-fatal — just omit search results
    }
  }

  return context;
}

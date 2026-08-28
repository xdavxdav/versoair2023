/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — KNOWLEDGE INJECTOR (God-Tier Brain: Database Grounding)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Takes a parsed IntentContext and returns the TOP verified businesses
 * from the real database that match the intent. This is the "grounding"
 * layer that prevents AI hallucinations and ensures responses are backed
 * by real data.
 */

import { pool } from "../db";
import type { IntentContext } from "./intent-parser";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessMatch {
  id: number;
  name: string;
  category: string;
  categorySlug: string;
  location: string;
  country: string;
  countryCode: string;
  description: string;
  rating: number | null;
  reviewCount: number;
  phone: string | null;
  website: string | null;
  isVerified: boolean;
  tier: string;
  avgResponseTimeHours: number | null;
  relevanceScore: number;
}

export interface KnowledgeResult {
  businesses: BusinessMatch[];
  totalMatches: number;
  searchMethod: string;
  isEmergency: boolean;
  emergencyMessage: string | null;
}

// ─── Sector slug → category name mapping ─────────────────────────────────────

const SECTOR_TO_CATEGORIES: Record<string, string[]> = {
  metallurgie: [
    "Metal",
    "Metallurgy",
    "Metalworking",
    "Steel",
    "Foundry",
    "Forge",
    "Welding",
    "Fabrication",
    "Machining",
  ],
  batiment: [
    "Construction",
    "Building",
    "Contractor",
    "Electrical",
    "Plumbing",
    "HVAC",
    "Civil Engineering",
  ],
  hotellerie: [
    "Hotel",
    "Tourism",
    "Hospitality",
    "Accommodation",
    "Lodging",
    "Resort",
    "Travel",
  ],
  commerce: [
    "Commerce",
    "Retail",
    "Shop",
    "Store",
    "Supermarket",
    "Mall",
    "Wholesale",
  ],
  automobile: [
    "Automobile",
    "Automotive",
    "Car",
    "Mechanic",
    "Garage",
    "Dealership",
  ],
  finances: [
    "Finance",
    "Bank",
    "Insurance",
    "Loan",
    "Investment",
    "Accounting",
  ],
  divertissement: [
    "Entertainment",
    "Event",
    "Music",
    "Cinema",
    "Nightclub",
    "Concert",
  ],
  sante: [
    "Health",
    "Medical",
    "Hospital",
    "Clinic",
    "Doctor",
    "Dental",
    "Pharmacy",
  ],
  restauration: ["Restaurant", "Cafe", "Food", "Catering", "Bakery", "Bistro"],
  "services-professionnels": [
    "Legal",
    "Law",
    "Consultant",
    "Advisor",
    "Notary",
    "Attorney",
  ],
  immobilier: ["Real Estate", "Property", "Apartment", "Housing"],
  education: ["Education", "School", "University", "Training", "Course"],
  technologie: ["Technology", "IT", "Software", "Computer", "Web", "Digital"],
  transport: [
    "Transport",
    "Shipping",
    "Delivery",
    "Logistics",
    "Moving",
    "Courier",
  ],
  beaute: ["Beauty", "Salon", "Spa", "Hair", "Wellness", "Barber"],
  agriculture: ["Agriculture", "Farm", "Organic", "Crop"],
};

// ─── Main Search Function ────────────────────────────────────────────────────

/**
 * Query the businesses database based on parsed intent.
 * Sorting strategy changes based on urgency:
 *   urgency >= 8 → sort by response_time ASC (fastest responders first)
 *   urgency <= 3 → sort by rating DESC + reviews_count DESC
 *   default → sort by tier rank (enterprise > premium > free) then rating
 */
export async function searchRelevantBusinesses(
  intent: IntentContext,
  limit: number = 5,
): Promise<KnowledgeResult> {
  const params: any[] = [];
  const whereClauses: string[] = ["b.is_active = true"];
  let orderClause: string;
  let searchMethod = "intent_filter";

  // ── Filter by sector categories ──
  if (intent.sector && SECTOR_TO_CATEGORIES[intent.sector]) {
    const categoryNames = SECTOR_TO_CATEGORIES[intent.sector];
    const placeholders = categoryNames.map(
      (_, i) => `$${params.length + i + 1}`,
    );
    params.push(...categoryNames);
    whereClauses.push(
      `(${placeholders.map((p) => `bc.name ILIKE ${p} || '%'`).join(" OR ")})`,
    );
    searchMethod = "sector_match";
  }

  // ── Filter by location ──
  if (intent.location) {
    params.push(`%${intent.location}%`);
    whereClauses.push(
      `(b.location ILIKE $${params.length} OR b.city_name ILIKE $${params.length} OR c.name ILIKE $${params.length})`,
    );
    searchMethod += "+location";
  }

  // ── Filter by country ──
  if (intent.countryCode) {
    params.push(intent.countryCode.toUpperCase());
    whereClauses.push(
      `UPPER(COALESCE(b.country_code, c.code, '')) = $${params.length}`,
    );
    searchMethod += "+country";
  }

  // ── Keyword full-text search (if no sector matched) ──
  if (!intent.sector && intent.keywords.length > 0) {
    const tsQuery = intent.keywords.join(" | ");
    params.push(tsQuery);
    whereClauses.push(`
      to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.location, ''))
      @@ to_tsquery('simple', $${params.length})
    `);
    searchMethod = "fulltext_keywords";
  }

  // ── Sorting strategy based on urgency ──
  if (intent.urgency >= 8) {
    // Emergency: fastest responders first, verified first
    orderClause = `
      CASE WHEN b.is_verified = true THEN 0 ELSE 1 END ASC,
      COALESCE(b.avg_response_time_hours, 999) ASC,
      CASE WHEN COALESCE(b.tier, 'free') = 'enterprise' THEN 0
           WHEN COALESCE(b.tier, 'free') = 'premium' THEN 1
           ELSE 2 END ASC,
      b.rating DESC NULLS LAST
    `;
  } else if (intent.urgency <= 3) {
    // Comparison shopping: best rated first
    orderClause = `
      b.rating DESC NULLS LAST,
      COALESCE(b.reviews_count, 0) DESC,
      CASE WHEN b.is_verified = true THEN 0 ELSE 1 END ASC
    `;
  } else {
    // Default: tier-weighted then rating
    orderClause = `
      CASE WHEN b.is_verified = true THEN 0 ELSE 1 END ASC,
      CASE WHEN COALESCE(b.tier, 'free') = 'enterprise' THEN 0
           WHEN COALESCE(b.tier, 'free') = 'premium' THEN 1
           ELSE 2 END ASC,
      b.rating DESC NULLS LAST,
      COALESCE(b.reviews_count, 0) DESC
    `;
  }

  const whereSQL = whereClauses.join(" AND ");

  try {
    // Count total matches
    const countRes = await pool.query(
      `SELECT COUNT(*) as total
       FROM businesses b
       LEFT JOIN business_categories bc ON b.category_id = bc.id
       LEFT JOIN countries c ON b.country_id = c.id
       WHERE ${whereSQL}`,
      params,
    );
    const totalMatches = parseInt(countRes.rows[0]?.total ?? "0");

    // Fetch top matches
    const res = await pool.query(
      `SELECT
        b.id,
        b.name,
        COALESCE(bc.name, 'General') AS category,
        COALESCE(bc.slug, '') AS category_slug,
        COALESCE(b.location, '') AS location,
        COALESCE(c.name, '') AS country,
        COALESCE(b.country_code, c.code, '') AS country_code,
        COALESCE(LEFT(b.description, 200), '') AS description,
        b.rating,
        COALESCE(b.reviews_count, 0) AS review_count,
        b.phone,
        b.website,
        COALESCE(b.is_verified, false) AS is_verified,
        COALESCE(b.tier, 'free') AS tier,
        b.avg_response_time_hours
       FROM businesses b
       LEFT JOIN business_categories bc ON b.category_id = bc.id
       LEFT JOIN countries c ON b.country_id = c.id
       WHERE ${whereSQL}
       ORDER BY ${orderClause}
       LIMIT ${limit}`,
      params,
    );

    const businesses: BusinessMatch[] = res.rows.map((r: any, idx: number) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      categorySlug: r.category_slug,
      location: r.location,
      country: r.country,
      countryCode: r.country_code,
      description: r.description,
      rating: r.rating ? parseFloat(r.rating) : null,
      reviewCount: parseInt(r.review_count) || 0,
      phone: r.phone,
      website: r.website,
      isVerified: r.is_verified,
      tier: r.tier,
      avgResponseTimeHours: r.avg_response_time_hours
        ? parseFloat(r.avg_response_time_hours)
        : null,
      // Relevance score: position-based + tier bonus + verified bonus
      relevanceScore: Math.round(
        ((limit - idx) / limit) * 60 +
          (r.is_verified ? 20 : 0) +
          (r.tier === "enterprise" ? 15 : r.tier === "premium" ? 10 : 0) +
          (r.rating ? (parseFloat(r.rating) / 5) * 5 : 0),
      ),
    }));

    // Emergency detection
    const isEmergency = intent.urgency >= 8;
    let emergencyMessage: string | null = null;
    if (isEmergency && businesses.length > 0) {
      const verifiedCount = businesses.filter((b) => b.isVerified).length;
      const fastestResponse = businesses[0]?.avgResponseTimeHours;
      emergencyMessage =
        `🚨 Emergency detected! Found ${totalMatches} ${intent.sectorLabel ?? "service"} providers` +
        (intent.location ? ` near ${intent.location}` : "") +
        `. ${verifiedCount} verified.` +
        (fastestResponse ? ` Fastest response: ~${fastestResponse}h.` : "");
    }

    return {
      businesses,
      totalMatches,
      searchMethod,
      isEmergency,
      emergencyMessage,
    };
  } catch (err: any) {
    console.error("[KnowledgeInjector] Query failed:", err.message);

    // Graceful fallback: try simpler query
    try {
      const fallbackRes = await pool.query(
        `SELECT b.id, b.name, COALESCE(bc.name, 'General') AS category,
                COALESCE(bc.slug, '') AS category_slug,
                COALESCE(b.location, '') AS location,
                COALESCE(c.name, '') AS country,
                COALESCE(b.country_code, c.code, '') AS country_code,
                COALESCE(LEFT(b.description, 200), '') AS description,
                b.rating, COALESCE(b.reviews_count, 0) AS review_count,
                b.phone, b.website,
                COALESCE(b.is_verified, false) AS is_verified,
                COALESCE(b.tier, 'free') AS tier,
                b.avg_response_time_hours
         FROM businesses b
         LEFT JOIN business_categories bc ON b.category_id = bc.id
         LEFT JOIN countries c ON b.country_id = c.id
         WHERE b.is_active = true
           AND (b.name ILIKE $1 OR b.description ILIKE $1)
         ORDER BY b.rating DESC NULLS LAST
         LIMIT $2`,
        [`%${intent.keywords[0] ?? intent.rawQuery.slice(0, 30)}%`, limit],
      );

      const businesses: BusinessMatch[] = fallbackRes.rows.map(
        (r: any, idx: number) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          categorySlug: r.category_slug,
          location: r.location,
          country: r.country,
          countryCode: r.country_code,
          description: r.description,
          rating: r.rating ? parseFloat(r.rating) : null,
          reviewCount: parseInt(r.review_count) || 0,
          phone: r.phone,
          website: r.website,
          isVerified: r.is_verified,
          tier: r.tier,
          avgResponseTimeHours: r.avg_response_time_hours
            ? parseFloat(r.avg_response_time_hours)
            : null,
          relevanceScore: Math.round(((limit - idx) / limit) * 50),
        }),
      );

      return {
        businesses,
        totalMatches: businesses.length,
        searchMethod: "ilike_fallback",
        isEmergency: intent.urgency >= 8,
        emergencyMessage: null,
      };
    } catch {
      return {
        businesses: [],
        totalMatches: 0,
        searchMethod: "error",
        isEmergency: false,
        emergencyMessage: null,
      };
    }
  }
}

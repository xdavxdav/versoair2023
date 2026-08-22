/**
 * One-time backfill: maps existing businesses and artist profiles into
 * UnifiedProfile. Old tables stay active — this only adds records to the
 * new unified table. Run via POST /api/admin/profiles/sync (superadmin only).
 */

import { db, pool } from "../db";
import { unifiedProfiles, businesses, artistProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

// Converts an arbitrary string to a URL-safe slug
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Checks unified_profiles for slug collision, appends suffix if needed
export async function generateUniqueSlug(
  rawName: string,
  accountType: string,
): Promise<string> {
  const base = slugify(rawName);
  const typeSuffix = `-${accountType}`;

  // Try bare slug first, then type-suffixed, then numeric
  const candidates = [base, `${base}${typeSuffix}`];
  for (let i = 2; i <= 99; i++) {
    candidates.push(`${base}${typeSuffix}-${i}`);
  }

  for (const candidate of candidates) {
    const [existing] = await db
      .select({ id: unifiedProfiles.id })
      .from(unifiedProfiles)
      .where(eq(unifiedProfiles.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
  }

  // Extreme fallback — timestamp ensures uniqueness
  return `${base}-${Date.now()}`;
}

// Derives publication status — approved+active is the publication gate; isVerified is a separate trust badge
function deriveStatus(
  approvalStatus?: string | null,
  verificationStatus?: string | null,
  isActive?: boolean | null,
): string {
  if (!isActive) return "SUSPENDED";
  if (approvalStatus === "approved") return "PUBLISHED";
  if (approvalStatus === "pending" || verificationStatus === "pending")
    return "PENDING";
  return "DRAFT";
}

export interface SyncResult {
  businessesSynced: number;
  artistsSynced: number;
  skipped: number;
  errors: string[];
}

// Backfills all existing businesses into unified_profiles (idempotent via legacyBusinessId check)
async function syncBusinesses(): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  const allBusinesses = await db.select().from(businesses);

  for (const biz of allBusinesses) {
    try {
      // Idempotent — skip if already synced
      const [existing] = await db
        .select({ id: unifiedProfiles.id })
        .from(unifiedProfiles)
        .where(eq(unifiedProfiles.legacyBusinessId, biz.id))
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      const slug = await generateUniqueSlug(biz.name, "business");
      const status = deriveStatus(
        biz.approvalStatus,
        biz.verificationStatus,
        biz.isActive,
      );

      await db.insert(unifiedProfiles).values({
        accountType: "business",
        ownerId: biz.ownerId ?? undefined,
        name: biz.name,
        slug,
        category: undefined, // resolved via join — stored in metadata for now
        description: biz.description ?? undefined,
        email: biz.email ?? undefined,
        phone: biz.phone ?? undefined,
        website: biz.website ?? undefined,
        socialLinks: (biz.socialLinks as Record<string, string>) ?? {},
        latitude: biz.latitude ?? undefined,
        longitude: biz.longitude ?? undefined,
        address: biz.address ?? undefined,
        cityId: biz.cityId ?? undefined,
        regionId: biz.regionId ?? undefined,
        countryId: biz.countryId ?? undefined,
        countryCode: biz.countryCode ?? undefined,
        cityName: biz.cityName ?? undefined,
        isVerified: biz.isVerified ?? false,
        verificationStatus: biz.verificationStatus ?? "pending",
        verifiedAt: biz.verifiedAt ?? undefined,
        status,
        logoUrl: biz.logoUrl ?? undefined,
        rating: biz.rating ?? undefined,
        reviewCount: biz.reviewsCount ?? 0,
        metadata: {
          businessType: biz.businessType,
          tier: biz.tier,
          tags: biz.tags,
          attributes: biz.attributes,
          approvalNotes: biz.approvalNotes,
        },
        legacyBusinessId: biz.id,
        createdAt: biz.createdAt ?? new Date(),
      });

      synced++;
    } catch (err) {
      errors.push(`Business #${biz.id} (${biz.name}): ${String(err)}`);
    }
  }

  return { synced, skipped, errors };
}

// Backfills artist_profiles if the table exists
async function syncArtists(): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    // artist_profiles may not exist — check first
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'artist_profiles' LIMIT 1`,
    );
    if (rows.length === 0) return { synced: 0, skipped: 0, errors: [] };

    const { rows: artists } = await pool.query(`SELECT * FROM artist_profiles`);

    for (const artist of artists) {
      try {
        const [existing] = await db
          .select({ id: unifiedProfiles.id })
          .from(unifiedProfiles)
          .where(eq(unifiedProfiles.legacyArtistProfileId, artist.id))
          .limit(1);

        if (existing) {
          skipped++;
          continue;
        }

        const name =
          artist.display_name ||
          artist.stage_name ||
          artist.name ||
          `Artist #${artist.id}`;
        const slug = await generateUniqueSlug(name, "artisan");

        await db.insert(unifiedProfiles).values({
          accountType: "artisan",
          ownerId: artist.user_id ?? undefined,
          name,
          slug,
          description: artist.bio ?? undefined,
          email: artist.email ?? undefined,
          website: artist.website_url ?? undefined,
          countryCode: artist.country_code ?? undefined,
          isVerified: artist.is_verified ?? false,
          verificationStatus: artist.is_verified ? "approved" : "pending",
          status: artist.is_verified ? "PUBLISHED" : "DRAFT",
          logoUrl: artist.avatar_url ?? undefined,
          profileImageUrl: artist.avatar_url ?? undefined,
          coverImageUrl: artist.cover_image_url ?? undefined,
          metadata: {
            genre: artist.genre,
            stageName: artist.stage_name,
            accountType: artist.account_type,
          },
          legacyArtistProfileId: artist.id,
        });

        synced++;
      } catch (err) {
        errors.push(`Artist #${artist.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Artist sync failed: ${String(err)}`);
  }

  return { synced, skipped, errors };
}

export async function syncLegacyProfiles(): Promise<SyncResult> {
  const [bizResult, artistResult] = await Promise.all([
    syncBusinesses(),
    syncArtists(),
  ]);

  return {
    businessesSynced: bizResult.synced,
    artistsSynced: artistResult.synced,
    skipped: bizResult.skipped + artistResult.skipped,
    errors: [...bizResult.errors, ...artistResult.errors],
  };
}

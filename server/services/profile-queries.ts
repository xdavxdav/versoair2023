/**
 * Centralized query helpers for UnifiedProfile.
 * All public-facing directory reads MUST go through getPublicProfiles().
 * This is the data-layer gate — unverified/unpublished records cannot leak.
 */

import { db } from "../db";
import { unifiedProfiles } from "@shared/schema";
import { eq, and, or, ilike, desc, asc } from "drizzle-orm";
import type { UnifiedProfile } from "@shared/schema";

export interface PublicProfileFilters {
  category?: string;
  query?: string;
  accountType?: "business" | "artisan" | "foundation";
  countryCode?: string;
  limit?: number;
  offset?: number;
}

// All public directory results — always enforces verified + published
export async function getPublicProfiles(
  filters: PublicProfileFilters = {},
): Promise<UnifiedProfile[]> {
  const {
    category,
    query,
    accountType,
    countryCode,
    limit = 20,
    offset = 0,
  } = filters;

  const conditions = [eq(unifiedProfiles.status, "PUBLISHED")];

  if (accountType)
    conditions.push(eq(unifiedProfiles.accountType, accountType));
  if (category) conditions.push(eq(unifiedProfiles.category, category));
  if (countryCode)
    conditions.push(eq(unifiedProfiles.countryCode, countryCode));

  let results = db
    .select()
    .from(unifiedProfiles)
    .where(and(...conditions))
    .orderBy(desc(unifiedProfiles.createdAt))
    .limit(limit)
    .offset(offset);

  if (query) {
    const like = `%${query}%`;
    return db
      .select()
      .from(unifiedProfiles)
      .where(
        and(
          eq(unifiedProfiles.status, "PUBLISHED"),
          ...(accountType
            ? [eq(unifiedProfiles.accountType, accountType)]
            : []),
          ...(category ? [eq(unifiedProfiles.category, category)] : []),
          ...(countryCode
            ? [eq(unifiedProfiles.countryCode, countryCode)]
            : []),
          or(
            ilike(unifiedProfiles.name, like),
            ilike(unifiedProfiles.description, like),
            ilike(unifiedProfiles.category, like),
            ilike(unifiedProfiles.cityName, like),
          ),
        ),
      )
      .orderBy(desc(unifiedProfiles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return results;
}

// Partner sees all their own profiles regardless of status
export async function getPartnerProfiles(
  ownerId: number,
): Promise<UnifiedProfile[]> {
  return db
    .select()
    .from(unifiedProfiles)
    .where(eq(unifiedProfiles.ownerId, ownerId))
    .orderBy(desc(unifiedProfiles.createdAt));
}

// Admin sees everything — no visibility filter
export async function getAdminProfiles(
  filters: {
    status?: string;
    verificationStatus?: string;
    accountType?: string;
  } = {},
): Promise<UnifiedProfile[]> {
  const conditions = [];

  if (filters.status)
    conditions.push(eq(unifiedProfiles.status, filters.status));
  if (filters.verificationStatus)
    conditions.push(
      eq(unifiedProfiles.verificationStatus, filters.verificationStatus),
    );
  if (filters.accountType)
    conditions.push(eq(unifiedProfiles.accountType, filters.accountType));

  if (conditions.length === 0) {
    return db
      .select()
      .from(unifiedProfiles)
      .orderBy(desc(unifiedProfiles.createdAt));
  }

  return db
    .select()
    .from(unifiedProfiles)
    .where(and(...conditions))
    .orderBy(desc(unifiedProfiles.createdAt));
}

// Single profile by slug — public only (PUBLISHED status)
export async function getPublicProfileBySlug(
  slug: string,
): Promise<UnifiedProfile | null> {
  const [profile] = await db
    .select()
    .from(unifiedProfiles)
    .where(
      and(
        eq(unifiedProfiles.slug, slug),
        eq(unifiedProfiles.status, "PUBLISHED"),
      ),
    )
    .limit(1);

  return profile ?? null;
}

// Single profile by slug — admin/owner (any status)
export async function getProfileBySlug(
  slug: string,
): Promise<UnifiedProfile | null> {
  const [profile] = await db
    .select()
    .from(unifiedProfiles)
    .where(eq(unifiedProfiles.slug, slug))
    .limit(1);

  return profile ?? null;
}

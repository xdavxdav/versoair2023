import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import {
  hasActivePaidSubscription,
  hasGeoAdminAccess,
} from "@shared/geoadmin-access";

export async function getGeoAdminEntitlement(
  userId: number,
  now = new Date(),
) {
  const [user] = await db
    .select({
      role: schema.users.role,
      subscriptionTier: schema.users.subscriptionTier,
      subscriptionStatus: schema.users.subscriptionStatus,
      subscriptionExpiresAt: schema.users.premiumExpiresAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) return null;

  const [addon] = await db
    .select({
      id: schema.geoAdminAddons.id,
      baseTier: schema.geoAdminAddons.baseTier,
      marketCode: schema.geoAdminAddons.marketCode,
      businessType: schema.geoAdminAddons.businessType,
      studyPriorities: schema.geoAdminAddons.studyPriorities,
      proposedFeePercent: schema.geoAdminAddons.proposedFeePercent,
      status: schema.geoAdminAddons.status,
      agreedAnnualAmount: schema.geoAdminAddons.agreedAnnualAmount,
      agreedCurrency: schema.geoAdminAddons.agreedCurrency,
      startsAt: schema.geoAdminAddons.startsAt,
      expiresAt: schema.geoAdminAddons.expiresAt,
    })
    .from(schema.geoAdminAddons)
    .where(eq(schema.geoAdminAddons.userId, userId))
    .orderBy(desc(schema.geoAdminAddons.requestedAt), desc(schema.geoAdminAddons.id))
    .limit(1);

  const state = {
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    addonStatus: addon?.status,
    addonBaseTier: addon?.baseTier,
    addonExpiresAt: addon?.expiresAt,
  };
  const isStaff = ["admin", "superuser", "moderator", "tsr"].includes(
    user.role ?? "",
  );
  const hasActiveSubscription = hasActivePaidSubscription(state, now);
  const hasAccess = hasGeoAdminAccess(state, now);
  const addonExpired =
    addon?.status === "active" &&
    (addon.expiresAt === null || addon.expiresAt.getTime() <= now.getTime());

  return {
    hasAccess,
    isStaff,
    hasActiveSubscription,
    role: user.role ?? "user",
    subscriptionTier: user.subscriptionTier ?? "free",
    addonStatus: addonExpired ? "expired" : (addon?.status ?? null),
    addon: addon
      ? {
          id: addon.id,
          baseTier: addon.baseTier,
          marketCode: addon.marketCode,
          businessType: addon.businessType,
          studyPriorities: addon.studyPriorities,
          proposedFeePercent: addon.proposedFeePercent,
          status: addonExpired ? "expired" : addon.status,
          agreedAnnualAmount: addon.agreedAnnualAmount,
          agreedCurrency: addon.agreedCurrency,
          startsAt: addon.startsAt,
          expiresAt: addon.expiresAt,
        }
      : null,
  };
}

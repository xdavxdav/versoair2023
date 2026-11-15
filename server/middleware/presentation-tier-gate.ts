import { Request, Response, NextFunction } from "express";

/**
 * Verified+ tier gate middleware for Presentation Maker
 * Only allows authenticated users with tier 'verified', 'max', or 'enterprise'
 */
export function requireVerifiedTier(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required to access Presentation Maker",
    });
    return;
  }

  const eligibleTiers = ["verified", "max", "enterprise"];
  if (!eligibleTiers.includes(user.subscriptionTier)) {
    res.status(403).json({
      error: "Forbidden",
      message: `Presentation Maker requires Verified tier or higher. Your tier: ${user.subscriptionTier}`,
      userTier: user.subscriptionTier,
      requiredTier: "verified",
    });
    return;
  }

  next();
}

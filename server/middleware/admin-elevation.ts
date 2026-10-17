import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "admin_elevation";
const ELEVATION_TTL_MS = 15 * 60 * 1000;
const ELEVATION_TTL_SECONDS = ELEVATION_TTL_MS / 1000;
const ELEVATION_PURPOSE = "admin-elevation";

type ElevationClaims = jwt.JwtPayload & {
  userId: string;
  purpose: typeof ELEVATION_PURPOSE;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

export function issueAdminElevation(res: Response, userId: string): void {
  const token = jwt.sign(
    { userId, purpose: ELEVATION_PURPOSE },
    getJwtSecret(),
    { expiresIn: ELEVATION_TTL_SECONDS },
  );
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: ELEVATION_TTL_MS,
  });
}

export function clearAdminElevation(res: Response): void {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export function hasAdminElevation(req: Request): boolean {
  const token = req.cookies?.[COOKIE_NAME];
  const authenticatedUserId = req.user?.userId;
  if (typeof token !== "string" || !authenticatedUserId) return false;

  try {
    const claims = jwt.verify(token, getJwtSecret()) as ElevationClaims;
    return (
      claims.purpose === ELEVATION_PURPOSE &&
      typeof claims.userId === "string" &&
      claims.userId === authenticatedUserId
    );
  } catch {
    return false;
  }
}

export function requireAdminElevation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role === "superuser" || hasAdminElevation(req)) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: {
      code: "ADMIN_ELEVATION_REQUIRED",
      message: "Admin access must be re-authenticated.",
    },
  });
}

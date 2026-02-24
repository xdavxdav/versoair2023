import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId: string;
  email: string;
  role: "admin" | "superuser" | "moderator" | "business_owner" | "user";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
  if (req.cookies?.auth_token) return req.cookies.auth_token as string;
  return null;
}

/**
 * Middleware to check if user is authenticated.
 * Accepts token from Authorization header OR HttpOnly cookie.
 */
export function requireAuth(allowedRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({
          success: false,
          status: 401,
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization token required",
          },
        });
      }

      const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;

      const user: AuthUser = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          status: 403,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
          },
        });
      }

      req.user = user;
      next();
    } catch {
      return res.status(401).json({
        success: false,
        status: 401,
        error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
      });
    }
  };
}

/**
 * Middleware for optional authentication.
 * Doesn't fail if no token, but attaches user if valid token provided.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
}

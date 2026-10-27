import type { AuthUser } from "../middleware/auth";
import type { Request, Response } from "express";
import { isConfiguredOwner } from "@shared/owner-access";

export type ActingUserResolution =
  | { ok: true; userId: number }
  | { ok: false; status: 400 | 401 | 403; error: string };

export interface ActingUserOptions {
  isOwner?: boolean;
  geoAdminCodeAuthenticated?: boolean;
  staffRoles?: readonly string[];
}

export function resolveActingUserId(
  user: Pick<AuthUser, "userId" | "role"> | null | undefined,
  requestedUserId: unknown,
  options: ActingUserOptions = {},
): ActingUserResolution {
  const sessionId = Number(user?.userId);
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  if (requestedUserId === undefined || requestedUserId === null || requestedUserId === "") {
    return { ok: true, userId: sessionId };
  }

  const targetId = Number(requestedUserId);
  if (!Number.isSafeInteger(targetId) || targetId <= 0) {
    return { ok: false, status: 400, error: "Invalid userId" };
  }
  if (targetId === sessionId) return { ok: true, userId: sessionId };

  if (
    options.staffRoles?.includes(user?.role ?? "") ||
    (options.isOwner === true && options.geoAdminCodeAuthenticated === true)
  ) {
    return { ok: true, userId: targetId };
  }

  return {
    ok: false,
    status: 403,
    error: "Cannot access another user's account",
  };
}

export function resolveRequestActingUserId(
  req: Request,
  res: Response,
  requestedUserId: unknown,
  options: Pick<ActingUserOptions, "staffRoles"> = {},
): number | null {
  const resolution = resolveActingUserId(req.user, requestedUserId, {
    isOwner: isConfiguredOwner(req.user, process.env.SUPERADMIN_EMAIL),
    geoAdminCodeAuthenticated: req.user?.geoAdminCodeAuthenticated,
    ...options,
  });
  if (!resolution.ok) {
    res.status(resolution.status).json({
      success: false,
      error: resolution.error,
    });
    return null;
  }
  return resolution.userId;
}

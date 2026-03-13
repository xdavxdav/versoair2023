import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { users, auditLogs } from "../../../../shared/schema";
import { eq, ilike, and, count, desc, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

// Helper: derive isActive from lock/verification status
function deriveUserStatus(user: any) {
  const now = new Date();
  const isLocked = user.lockedUntil && new Date(user.lockedUntil) > now;
  return {
    ...user,
    isActive: !isLocked,
    isLocked: !!isLocked,
  };
}

/**
 * GET /api/v1/admin/users
 * List all users with pagination, filtering, and role filter
 */
router.get(
  "/",
  requireAuth(["admin", "moderator", "superuser"]),
  asyncHandler(async (req, res) => {
    const { page = "1", limit = "20", search, role } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.username, `${search}%`),
          ilike(users.email, `${search}%`),
        ),
      );
    }

    if (role && typeof role === "string") {
      conditions.push(eq(users.role, role));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch total count and paginated data
    const [totalResult, data] = await Promise.all([
      db.select({ total: count() }).from(users).where(where),
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          gateUsername: users.gateUsername,
          isVerified: users.isVerified,
          verifiedAt: users.verifiedAt,
          subscriptionTier: users.subscriptionTier,
          subscriptionStatus: users.subscriptionStatus,
          failedLoginAttempts: users.failedLoginAttempts,
          lockedUntil: users.lockedUntil,
          portalAccess: users.portalAccess,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.id))
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total || 0;
    const enriched = data.map(deriveUserStatus);

    res.json({
      success: true,
      status: 200,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * POST /api/v1/admin/users
 * Create a new user
 */
router.post(
  "/",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const {
      username,
      email,
      password,
      role = "user",
      gateUsername,
      isVerified,
      subscriptionTier,
      portalAccess,
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Username, email, and password are required",
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email format",
        },
      });
    }

    // Validate password strength
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Password must be 8+ characters with an uppercase letter and a number",
        },
      });
    }

    // Check for existing username/email
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        status: 409,
        error: {
          code: "DUPLICATE_ERROR",
          message: "Username or email already exists",
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertValues: Record<string, any> = {
      username,
      email,
      password: hashedPassword,
      role,
      isVerified: isVerified === true,
    };
    if (gateUsername && gateUsername.trim()) {
      insertValues.gateUsername = gateUsername.trim().toLowerCase();
    }
    if (subscriptionTier) {
      insertValues.subscriptionTier = subscriptionTier;
    }
    if (portalAccess && Array.isArray(portalAccess)) {
      insertValues.portalAccess = portalAccess;
    }

    const [user] = await db.insert(users).values(insertValues).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      gateUsername: users.gateUsername,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
    });

    // Audit log (skip if fails)
    await db
      .insert(auditLogs)
      .values({
        userId: undefined,
        action: "CREATE",
        entityType: "users",
        entityId: String(user.id),
        changes: { created: true },
      })
      .catch(() => null);

    res.status(201).json({
      success: true,
      status: 201,
      data: user,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * GET /api/v1/admin/users/:id
 * Get a specific user
 */
router.get(
  "/:id",
  requireAuth(["admin", "moderator", "superuser"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        gateUsername: users.gateUsername,
        isVerified: users.isVerified,
        verifiedAt: users.verifiedAt,
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
        portalAccess: users.portalAccess,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    res.json({
      success: true,
      status: 200,
      data: deriveUserStatus(user[0]),
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * PUT /api/v1/admin/users/:id
 * Update a user
 */
router.put(
  "/:id",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      username,
      email,
      role,
      isVerified,
      password,
      subscriptionTier,
      gateUsername,
      portalAccess,
    } = req.body;
    const userId = parseInt(id, 10);

    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const updates: Record<string, any> = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (isVerified !== undefined) {
      updates.isVerified = isVerified;
      if (isVerified) updates.verifiedAt = new Date();
    }
    if (subscriptionTier !== undefined)
      updates.subscriptionTier = subscriptionTier;
    if (gateUsername !== undefined) {
      updates.gateUsername =
        gateUsername && gateUsername.trim()
          ? gateUsername.trim().toLowerCase()
          : null;
    }
    if (portalAccess !== undefined && Array.isArray(portalAccess)) {
      updates.portalAccess = portalAccess;
    }
    if (password !== undefined) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "No fields to update",
        },
      });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        gateUsername: users.gateUsername,
        isVerified: users.isVerified,
        verifiedAt: users.verifiedAt,
        subscriptionTier: users.subscriptionTier,
        portalAccess: users.portalAccess,
        lockedUntil: users.lockedUntil,
        createdAt: users.createdAt,
      });

    // Audit log (skip if fails)
    await db
      .insert(auditLogs)
      .values({
        userId: undefined,
        action: "UPDATE",
        entityType: "users",
        entityId: String(userId),
        changes: updates,
      })
      .catch(() => null);

    res.json({
      success: true,
      status: 200,
      data: deriveUserStatus(updated),
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * DELETE /api/v1/admin/users/:id
 * Delete a user (prevents deleting admin/superuser accounts)
 */
router.delete(
  "/:id",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    if (user[0].role === "admin" || user[0].role === "superuser") {
      return res.status(403).json({
        success: false,
        status: 403,
        error: {
          code: "FORBIDDEN",
          message: "Cannot delete admin or superuser accounts",
        },
      });
    }

    await db.delete(users).where(eq(users.id, userId));

    // Audit log (skip if fails)
    await db
      .insert(auditLogs)
      .values({
        userId: undefined,
        action: "DELETE",
        entityType: "users",
        entityId: String(userId),
        changes: { deleted: true, username: user[0].username },
      })
      .catch(() => null);

    res.json({
      success: true,
      status: 200,
      message: "User deleted successfully",
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

export default router;

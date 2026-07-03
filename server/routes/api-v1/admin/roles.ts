import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { users, auditLogs } from "../../../../shared/schema";
import { eq, count } from "drizzle-orm";

const router = Router();

// Available permissions for role management
const AVAILABLE_PERMISSIONS = [
  "businesses.read",
  "businesses.write",
  "businesses.delete",
  "categories.read",
  "categories.write",
  "categories.delete",
  "jobs.read",
  "jobs.write",
  "jobs.delete",
  "users.read",
  "users.write",
  "users.delete",
  "analytics.read",
  "reports.read",
  "reports.export",
  "advertising.read",
  "advertising.write",
  "system.admin",
  "system.backup",
  "system.security",
];

// Role definitions with default permissions
const ROLE_DEFINITIONS: Record<
  string,
  { description: string; permissions: string[]; color: string }
> = {
  superuser: {
    description: "Full system access with all permissions",
    permissions: AVAILABLE_PERMISSIONS,
    color: "bg-red-100 text-red-800",
  },
  admin: {
    description:
      "Administrative access to manage businesses, users, and settings",
    permissions: [
      "businesses.read",
      "businesses.write",
      "businesses.delete",
      "categories.read",
      "categories.write",
      "categories.delete",
      "jobs.read",
      "jobs.write",
      "jobs.delete",
      "users.read",
      "users.write",
      "analytics.read",
      "reports.read",
      "reports.export",
      "advertising.read",
      "advertising.write",
    ],
    color: "bg-orange-100 text-orange-800",
  },
  moderator: {
    description: "Can review and moderate content, businesses, and users",
    permissions: [
      "businesses.read",
      "businesses.write",
      "categories.read",
      "jobs.read",
      "jobs.write",
      "users.read",
      "analytics.read",
      "reports.read",
    ],
    color: "bg-blue-100 text-blue-800",
  },
  business_owner: {
    description: "Manage own business listings and job postings",
    permissions: [
      "businesses.read",
      "businesses.write",
      "jobs.read",
      "jobs.write",
      "analytics.read",
    ],
    color: "bg-purple-100 text-purple-800",
  },
  user: {
    description: "Basic user access — browse and interact with the platform",
    permissions: ["businesses.read", "jobs.read"],
    color: "bg-gray-100 text-gray-800",
  },
};

/**
 * GET /api/v1/admin/roles
 * List all roles with user counts
 */
router.get(
  "/",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    try {
      // Get user counts per role from the database
      const roleCounts = await db
        .select({
          role: users.role,
          userCount: count(),
        })
        .from(users)
        .groupBy(users.role);

      const roleCountMap = new Map<string, number>();
      for (const rc of roleCounts) {
        roleCountMap.set(rc.role || "user", Number(rc.userCount));
      }

      // Build roles list from definitions + DB counts
      const roles = Object.entries(ROLE_DEFINITIONS).map(
        ([name, def], index) => ({
          id: index + 1,
          name,
          description: def.description,
          permissions: def.permissions,
          color: def.color,
          userCount: roleCountMap.get(name) || 0,
          isSystem: ["superuser", "admin", "user"].includes(name),
          createdAt: new Date().toISOString(),
        }),
      );

      res.json({
        success: true,
        status: 200,
        data: roles,
        metadata: {
          timestamp: new Date().toISOString(),
          availablePermissions: AVAILABLE_PERMISSIONS,
        },
      });
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      res.status(500).json({
        success: false,
        status: 500,
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch roles",
        },
      });
    }
  }),
);

/**
 * GET /api/v1/admin/roles/:id
 * Get a specific role by ID
 */
router.get(
  "/:id",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id, 10);
    const roleEntries = Object.entries(ROLE_DEFINITIONS);

    if (roleId < 1 || roleId > roleEntries.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Role not found" },
      });
    }

    const [name, def] = roleEntries[roleId - 1];

    // Get user count for this role
    const [result] = await db
      .select({ userCount: count() })
      .from(users)
      .where(eq(users.role, name));

    res.json({
      success: true,
      status: 200,
      data: {
        id: roleId,
        name,
        description: def.description,
        permissions: def.permissions,
        color: def.color,
        userCount: Number(result?.userCount || 0),
        isSystem: ["superuser", "admin", "user"].includes(name),
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * POST /api/v1/admin/roles
 * Create a custom role (adds to in-memory definitions)
 */
router.post(
  "/",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const { name, description, permissions = [] } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Role name is required",
        },
      });
    }

    const roleName = name.toLowerCase().replace(/\s+/g, "_");

    // Check if role already exists
    if (ROLE_DEFINITIONS[roleName]) {
      return res.status(409).json({
        success: false,
        status: 409,
        error: {
          code: "DUPLICATE_ROLE",
          message: `Role '${roleName}' already exists`,
        },
      });
    }

    // Validate permissions
    const validPermissions = permissions.filter((p: string) =>
      AVAILABLE_PERMISSIONS.includes(p),
    );

    // Add to definitions
    ROLE_DEFINITIONS[roleName] = {
      description: description || `Custom role: ${name}`,
      permissions: validPermissions,
      color: "bg-indigo-100 text-indigo-800",
    };

    const newId = Object.keys(ROLE_DEFINITIONS).length;

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "CREATE",
        entityType: "role",
        entityId: String(newId),
        changes: { name: roleName, permissions: validPermissions },
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    res.status(201).json({
      success: true,
      status: 201,
      data: {
        id: newId,
        name: roleName,
        description: description || `Custom role: ${name}`,
        permissions: validPermissions,
        color: "bg-indigo-100 text-indigo-800",
        userCount: 0,
        isSystem: false,
        createdAt: new Date().toISOString(),
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * PUT /api/v1/admin/roles/:id
 * Update a role's description and permissions
 */
router.put(
  "/:id",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id, 10);
    const { name, description, permissions } = req.body;
    const roleEntries = Object.entries(ROLE_DEFINITIONS);

    if (roleId < 1 || roleId > roleEntries.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Role not found" },
      });
    }

    const [roleName, roleDef] = roleEntries[roleId - 1];

    // Prevent modifying system roles' names
    if (
      ["superuser", "admin", "user"].includes(roleName) &&
      name &&
      name !== roleName
    ) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: {
          code: "FORBIDDEN",
          message: "Cannot rename system roles",
        },
      });
    }

    // Update the role definition
    if (description !== undefined)
      ROLE_DEFINITIONS[roleName].description = description;
    if (permissions !== undefined) {
      ROLE_DEFINITIONS[roleName].permissions = permissions.filter((p: string) =>
        AVAILABLE_PERMISSIONS.includes(p),
      );
    }

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "UPDATE",
        entityType: "role",
        entityId: String(roleId),
        changes: { description, permissions },
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    // Get user count
    const [result] = await db
      .select({ userCount: count() })
      .from(users)
      .where(eq(users.role, roleName));

    res.json({
      success: true,
      status: 200,
      data: {
        id: roleId,
        name: roleName,
        description: ROLE_DEFINITIONS[roleName].description,
        permissions: ROLE_DEFINITIONS[roleName].permissions,
        color: ROLE_DEFINITIONS[roleName].color,
        userCount: Number(result?.userCount || 0),
        isSystem: ["superuser", "admin", "user"].includes(roleName),
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * DELETE /api/v1/admin/roles/:id
 * Delete a custom role (reassigns users to 'user' role)
 */
router.delete(
  "/:id",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id, 10);
    const roleEntries = Object.entries(ROLE_DEFINITIONS);

    if (roleId < 1 || roleId > roleEntries.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Role not found" },
      });
    }

    const [roleName] = roleEntries[roleId - 1];

    // Prevent deleting system roles
    if (["superuser", "admin", "user"].includes(roleName)) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: {
          code: "FORBIDDEN",
          message: "Cannot delete system roles (superuser, admin, user)",
        },
      });
    }

    // Reassign any users with this role to 'user'
    const reassigned = await db
      .update(users)
      .set({ role: "user" })
      .where(eq(users.role, roleName))
      .returning({ id: users.id });

    // Remove from definitions
    delete ROLE_DEFINITIONS[roleName];

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "DELETE",
        entityType: "role",
        entityId: String(roleId),
        changes: {
          deleted: roleName,
          reassignedUsers: reassigned.length,
        },
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    res.json({
      success: true,
      status: 200,
      data: {
        deleted: roleName,
        reassignedUsers: reassigned.length,
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * POST /api/v1/admin/roles/:id/assign
 * Assign a role to a user
 */
router.post(
  "/:id/assign",
  requireAuth(["admin", "superuser"]),
  asyncHandler(async (req, res) => {
    const roleId = parseInt(req.params.id, 10);
    const { userId } = req.body;
    const roleEntries = Object.entries(ROLE_DEFINITIONS);

    if (roleId < 1 || roleId > roleEntries.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "Role not found" },
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "userId is required",
        },
      });
    }

    const [roleName] = roleEntries[roleId - 1];

    // Update user's role
    const [updated] = await db
      .update(users)
      .set({ role: roleName })
      .where(eq(users.id, parseInt(userId, 10)))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
      });

    if (!updated) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    // Audit log
    try {
      await db.insert(auditLogs).values({
        action: "UPDATE",
        entityType: "users",
        entityId: String(userId),
        changes: { role: roleName },
      });
    } catch (e) {
      console.warn("Audit log insert failed:", e);
    }

    res.json({
      success: true,
      status: 200,
      data: updated,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

export default router;

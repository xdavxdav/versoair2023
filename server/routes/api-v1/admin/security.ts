/**
 * Admin Security Routes
 * Manage users, account lockouts, password resets, and SMTP configuration.
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { eq, desc, isNotNull, gt } from "drizzle-orm";
import { db } from "../../../db";
import * as schema from "../../../../shared/schema";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";

const router = Router();

// All routes require admin role
router.use(requireAuth(["admin", "superuser"]));

// ─── User Security Overview ────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/security/users
 * List all users with security status (locked, reset pending, failed attempts)
 */
router.get(
  "/users",
  asyncHandler(async (_req: Request, res: Response) => {
    const allUsers = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        role: schema.users.role,
        isVerified: schema.users.isVerified,
        failedLoginAttempts: schema.users.failedLoginAttempts,
        lockedUntil: schema.users.lockedUntil,
        passwordResetToken: schema.users.passwordResetToken,
        passwordResetExpires: schema.users.passwordResetExpires,
        password: schema.users.password,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));

    const now = new Date();

    const enriched = allUsers.map(({ password, ...u }) => ({
      ...u,
      isLocked: !!(u.lockedUntil && new Date(u.lockedUntil) > now),
      hasResetPending: !!(
        u.passwordResetToken &&
        u.passwordResetExpires &&
        new Date(u.passwordResetExpires) > now
      ),
      needsForcedReset: password === "RESET_REQUIRED",
    }));

    res.json({ success: true, data: enriched });
  }),
);

/**
 * POST /api/v1/admin/security/users/:id/unlock
 * Unlock a locked account and reset failed attempt counter
 */
router.post(
  "/users/:id/unlock",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    await db
      .update(schema.users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, userId));

    res.json({ success: true, message: "Account unlocked successfully" });
  }),
);

/**
 * POST /api/v1/admin/security/users/:id/force-reset
 * Force a password reset for a user (invalidates current password)
 */
router.post(
  "/users/:id/force-reset",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    await db
      .update(schema.users)
      .set({
        password: "RESET_REQUIRED",
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(schema.users.id, userId));

    res.json({
      success: true,
      message: "User must reset their password on next login",
    });
  }),
);

/**
 * POST /api/v1/admin/security/users/:id/change-role
 * Change a user's role
 */
router.post(
  "/users/:id/change-role",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { role } = req.body;

    const validRoles = [
      "user",
      "moderator",
      "admin",
      "superuser",
      "business_owner",
    ];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(", ")}`,
      });
      return;
    }

    // Prevent demoting self
    const requestingUserId = req.user?.userId;
    if (String(userId) === String(requestingUserId)) {
      res.status(403).json({
        success: false,
        message: "You cannot change your own role",
      });
      return;
    }

    await db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, userId));

    res.json({ success: true, message: `Role updated to ${role}` });
  }),
);

/**
 * DELETE /api/v1/admin/security/users/:id
 * Delete a user account
 */
router.delete(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.id);

    const requestingUserId = req.user?.userId;
    if (String(userId) === String(requestingUserId)) {
      res.status(403).json({
        success: false,
        message: "You cannot delete your own account",
      });
      return;
    }

    await db.delete(schema.users).where(eq(schema.users.id, userId));
    res.json({ success: true, message: "User deleted" });
  }),
);

// ─── SMTP Configuration ───────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/security/smtp
 * Get current SMTP configuration (passwords masked)
 */
router.get(
  "/smtp",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        host: process.env.SMTP_HOST || "",
        port: process.env.SMTP_PORT || "587",
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS ? "••••••••" : "",
        from: process.env.SMTP_FROM || "",
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      },
    });
  }),
);

/**
 * POST /api/v1/admin/security/smtp/test
 * Test SMTP connection with provided credentials
 */
router.post(
  "/smtp/test",
  asyncHandler(async (req: Request, res: Response) => {
    const { host, port, user, pass, from, to } = req.body;

    if (!host || !user || !pass || !to) {
      res.status(400).json({
        success: false,
        message: "host, user, pass, and to (test recipient) are required",
      });
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
      });

      await transporter.verify();

      await transporter.sendMail({
        from: from || user,
        to,
        subject: "✅ Verso Air SMTP Test",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#bf831c;">SMTP Connection Test</h2>
            <p>This is a test email from your <strong>Verso Air</strong> admin panel.</p>
            <p style="color:#555;">If you're reading this, your SMTP configuration is working correctly.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
            <p style="font-size:12px;color:#999;">
              Sent: ${new Date().toISOString()}<br/>
              Host: ${host}:${port}<br/>
              From: ${from || user}
            </p>
          </div>
        `,
      });

      res.json({ success: true, message: `Test email sent to ${to}` });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: `SMTP error: ${err.message}`,
      });
    }
  }),
);

/**
 * POST /api/v1/admin/security/smtp/save
 * Persist SMTP settings to process.env at runtime.
 * NOTE: For permanent persistence, write to .env file or your secret manager.
 */
router.post(
  "/smtp/save",
  asyncHandler(async (req: Request, res: Response) => {
    const { host, port, user, pass, from } = req.body;

    if (!host || !user || !pass) {
      res.status(400).json({
        success: false,
        message: "host, user, and pass are required",
      });
      return;
    }

    // Apply to running process immediately
    process.env.SMTP_HOST = host;
    process.env.SMTP_PORT = String(port || 587);
    process.env.SMTP_USER = user;
    if (pass !== "••••••••") process.env.SMTP_PASS = pass;
    if (from) process.env.SMTP_FROM = from;

    // Re-initialize the email transporter with new settings
    const { initializeEmailTransporter } =
      await import("../../../services/email-service");
    initializeEmailTransporter();

    res.json({
      success: true,
      message:
        "SMTP settings applied. Add them to your .env for persistence across restarts.",
    });
  }),
);

// ─── Security Stats ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/security/stats
 * Summary counts for the security dashboard
 */
router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();

    const [totalUsers, lockedUsers, resetPending] = await Promise.all([
      db.select({ id: schema.users.id }).from(schema.users),
      db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(gt(schema.users.lockedUntil, now)),
      db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(isNotNull(schema.users.passwordResetToken)),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.length,
        lockedAccounts: lockedUsers.length,
        pendingResets: resetPending.length,
      },
    });
  }),
);

export default router;

import nodemailer, { Transporter } from "nodemailer";
import { db } from "../db";
import { auditLogs } from "@shared/schema";

/**
 * Email Service
 * Sends transactional emails for notifications with error tracking in auditLogs
 */

let transporter: Transporter | null = null;

/**
 * Initialize the email transporter with SMTP configuration
 * Uses environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
export function initializeEmailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@versoair.com";

  if (!user || !pass) {
    console.warn(
      "[EMAIL] SMTP credentials not configured. Email notifications disabled.",
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    from,
  });

  console.log(`[EMAIL] Transporter initialized. Sending from: ${from}`);
  return transporter;
}

/**
 * Send connection request notification email
 */
export async function sendConnectionRequestEmail(
  toEmail: string,
  toName: string,
  fromName: string,
  connectionRequestUrl?: string,
): Promise<boolean> {
  if (!transporter) {
    console.warn("[EMAIL] Transporter not initialized");
    return false;
  }

  try {
    const subject = `${fromName} sent you a connection request`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #bf831c 0%, #d4a037 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .body { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #bf831c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
            .highlight { color: #bf831c; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤝 New Connection Request</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${toName}</strong>,</p>
              <p><span class="highlight">${fromName}</span> sent you a connection request on Versoair!</p>
              <p>By connecting, you'll be able to:</p>
              <ul>
                <li>View their business profile and analytics</li>
                <li>See their 7-day performance metrics</li>
                <li>Collaborate on shared opportunities</li>
                <li>Stay updated on their business growth</li>
              </ul>
              <p>
                <a href="${connectionRequestUrl || "https://versoair.com/connections"}" class="button">
                  View Connection Request
                </a>
              </p>
              <p>If you prefer not to receive these emails, you can adjust your notification preferences in your account settings.</p>
            </div>
            <div class="footer">
              <p><strong>Versoair</strong> - Business Intelligence Platform</p>
              <p>Connecting businesses with actionable insights</p>
              <p>© ${new Date().getFullYear()} Versoair. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(
      `[EMAIL] Connection request email sent to ${toEmail}. Message ID: ${result.messageId}`,
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[EMAIL] Error sending connection request email to ${toEmail}:`,
      errorMessage,
    );

    // Log to audit trail as SYSTEM_ERROR
    try {
      await db.insert(auditLogs).values({
        userId: 0, // System-generated
        action: "SYSTEM_ERROR",
        entityType: "notification",
        entityId: "email_connection_request",
        changes: {
          error: errorMessage,
          toEmail,
          fromName,
          timestamp: new Date().toISOString(),
        },
        ipAddress: "system",
      });
    } catch (auditError) {
      console.error(
        "[EMAIL] Failed to log email error to audit trail:",
        auditError,
      );
    }

    return false;
  }
}

/**
 * Send connection accepted notification email
 */
export async function sendConnectionAcceptedEmail(
  toEmail: string,
  toName: string,
  fromName: string,
  profileUrl?: string,
): Promise<boolean> {
  if (!transporter) {
    console.warn("[EMAIL] Transporter not initialized");
    return false;
  }

  try {
    const subject = `${fromName} accepted your connection request`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .body { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
            .highlight { color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Connection Accepted!</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${toName}</strong>,</p>
              <p><span class="highlight">${fromName}</span> accepted your connection request! 🎉</p>
              <p>You're now connected and can:</p>
              <ul>
                <li>View their real-time business performance metrics</li>
                <li>Compare growth trends side-by-side</li>
                <li>Access their latest analytics and insights</li>
                <li>Collaborate on business opportunities</li>
              </ul>
              <p>
                <a href="${profileUrl || "https://versoair.com/network"}" class="button">
                  View Your Network
                </a>
              </p>
              <p>Keep building your professional network on Versoair!</p>
            </div>
            <div class="footer">
              <p><strong>Versoair</strong> - Business Intelligence Platform</p>
              <p>Growing networks. Growing businesses.</p>
              <p>© ${new Date().getFullYear()} Versoair. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(
      `[EMAIL] Connection accepted email sent to ${toEmail}. Message ID: ${result.messageId}`,
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[EMAIL] Error sending connection accepted email to ${toEmail}:`,
      errorMessage,
    );

    // Log to audit trail as SYSTEM_ERROR
    try {
      await db.insert(auditLogs).values({
        userId: 0, // System-generated
        action: "SYSTEM_ERROR",
        entityType: "notification",
        entityId: "email_connection_accepted",
        changes: {
          error: errorMessage,
          toEmail,
          fromName,
          timestamp: new Date().toISOString(),
        },
        ipAddress: "system",
      });
    } catch (auditError) {
      console.error(
        "[EMAIL] Failed to log email error to audit trail:",
        auditError,
      );
    }

    return false;
  }
}

/**
 * Send email verification link to newly registered user
 */
export async function sendVerificationEmail(
  toEmail: string,
  verificationToken: string,
): Promise<boolean> {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";
  const verifyUrl = `${appUrl}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #bf831c 0%, #d4a037 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 10px 0 0; opacity: 0.9; font-size: 16px; }
          .body { background: white; padding: 40px 30px; }
          .button { display: inline-block; background: linear-gradient(135deg, #bf831c, #d4a037); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: bold; font-size: 18px; letter-spacing: 0.5px; }
          .info-box { background: #fff9e5; border-left: 4px solid #bf831c; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #555; border-radius: 0 8px 8px 0; }
          .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
          .footer a { color: #bf831c; text-decoration: none; }
          .url { word-break: break-all; color: #bf831c; font-size: 13px; }
          .welcome-icon { font-size: 48px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="welcome-icon">✨</div>
            <h1>Welcome to Verso Air!</h1>
            <p>Verify your email to get started</p>
          </div>
          <div class="body">
            <p style="font-size: 16px; color: #333;">Thank you for creating your <strong>Verso Air</strong> account!</p>
            <p style="font-size: 16px; color: #333;">Click the button below to verify your email address and activate your account. This link expires in <strong>24 hours</strong>.</p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verify My Email</a>
            </div>
            <div class="info-box">
              <strong>🔒 Security Note:</strong> If you didn't create a Verso Air account, you can safely ignore this email. No account will be activated.
            </div>
            <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this URL into your browser:</p>
            <p class="url">${verifyUrl}</p>
          </div>
          <div class="footer">
            <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
            <p>Connecting African businesses with global opportunities</p>
            <p>&copy; ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(toEmail, "Verify your Verso Air email", htmlContent);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
): Promise<boolean> {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";
  const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #bf831c 0%, #d4a037 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .body { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #bf831c; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .warning { background: #fff8e1; border-left: 4px solid #bf831c; padding: 12px 16px; margin: 20px 0; font-size: 14px; color: #555; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #999; }
          .url { word-break: break-all; color: #bf831c; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Your Password</h1>
          </div>
          <div class="body">
            <p>You requested a password reset for your <strong>Verso Air</strong> account.</p>
            <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            <div class="warning">
              ⚠️ If you didn't request this, you can safely ignore this email. Your password has <strong>not</strong> been changed.
            </div>
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <p class="url">${resetUrl}</p>
          </div>
          <div class="footer">
            <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
            <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(toEmail, "Reset your Verso Air password", htmlContent);
}

/**
 * Generic send email function
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; path: string; contentType?: string }>,
): Promise<boolean> {
  if (!transporter) {
    console.warn("[EMAIL] Transporter not initialized");
    return false;
  }

  try {
    const result = await transporter.sendMail({
      to,
      subject,
      html,
      attachments,
    });

    console.log(`[EMAIL] Email sent to ${to}. Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL] Error sending email to ${to}:`, errorMessage);

    // Log to audit trail
    try {
      await db.insert(auditLogs).values({
        userId: 0,
        action: "SYSTEM_ERROR",
        entityType: "notification",
        entityId: "email_generic",
        changes: {
          error: errorMessage,
          to,
          subject,
          timestamp: new Date().toISOString(),
        },
        ipAddress: "system",
      });
    } catch (auditError) {
      console.error("[EMAIL] Failed to log email error:", auditError);
    }

    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BUSINESS APPROVAL WORKFLOW EMAILS
// ══════════════════════════════════════════════════════════════════════════════

export interface BusinessApprovalData {
  businessId: number;
  businessName: string;
  categoryName?: string;
  submittedBy: string; // username
  submittedByEmail?: string;
  description?: string;
  address?: string;
  cityName?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
}

/**
 * Send business approval request email to admin — includes PDF attachment
 */
export async function sendBusinessApprovalRequestEmail(
  adminEmail: string,
  data: BusinessApprovalData,
  pdfPath?: string,
): Promise<boolean> {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const subject = `📋 New Business Registration — ${data.businessName} (Approval Required)`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #bf831c 0%, #d4a037 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 8px 0 0; opacity: 0.9; }
          .body { background: white; padding: 32px 24px; }
          .field { display: flex; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
          .field-label { color: #666; font-size: 14px; min-width: 120px; font-weight: 600; }
          .field-value { color: #1a1a2e; font-size: 14px; }
          .badge { display: inline-block; background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .actions { text-align: center; margin: 24px 0; }
          .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 0 8px; }
          .btn-approve { background: #059669; color: white !important; }
          .btn-reject { background: #dc2626; color: white !important; }
          .btn-view { background: #bf831c; color: white !important; }
          .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Business Registration Request</h1>
            <p>A new business needs your approval</p>
          </div>
          <div class="body">
            <p>Hi Admin,</p>
            <p>A GeoAdmin user has submitted a new business for registration. Please review the details below:</p>

            <div style="background: #f8f9fa; border-left: 4px solid #bf831c; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px; color: #1a1a2e;">${data.businessName}</h3>
              <span class="badge">⏳ Pending Approval</span>
            </div>

            <div style="margin: 20px 0;">
              <div class="field"><span class="field-label">Category</span><span class="field-value">${data.categoryName || "—"}</span></div>
              <div class="field"><span class="field-label">Description</span><span class="field-value">${data.description || "—"}</span></div>
              <div class="field"><span class="field-label">Address</span><span class="field-value">${data.address || "—"}</span></div>
              <div class="field"><span class="field-label">City</span><span class="field-value">${data.cityName || "—"}</span></div>
              <div class="field"><span class="field-label">Country</span><span class="field-value">${data.countryCode || "—"}</span></div>
              <div class="field"><span class="field-label">Phone</span><span class="field-value">${data.phone || "—"}</span></div>
              <div class="field"><span class="field-label">Email</span><span class="field-value">${data.email || "—"}</span></div>
              <div class="field"><span class="field-label">Submitted By</span><span class="field-value">${data.submittedBy}</span></div>
              <div class="field" style="border-bottom: none;"><span class="field-label">Reference</span><span class="field-value">VA-BIZ-${data.businessId}</span></div>
            </div>

            <div class="actions">
              <a href="${appUrl}/geo-admin/dashboard" class="btn btn-view">Review in Dashboard</a>
            </div>

            ${pdfPath ? '<p style="font-size: 13px; color: #888; text-align: center;">📎 The full registration PDF is attached to this email.</p>' : ""}
          </div>
          <div class="footer">
            <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
            <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const attachments = pdfPath
    ? [
        {
          filename: `business-registration-${data.businessId}.pdf`,
          path: pdfPath,
          contentType: "application/pdf",
        },
      ]
    : undefined;

  return sendEmail(adminEmail, subject, htmlContent, attachments);
}

/**
 * Send notification to submitter when business is approved
 */
export async function sendBusinessApprovedEmail(
  toEmail: string,
  toName: string,
  businessName: string,
  notes?: string,
): Promise<boolean> {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const subject = `✅ Your business "${businessName}" has been approved!`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
          .body { background: white; padding: 32px 24px; }
          .button { display: inline-block; background: #059669; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
            <h1>Business Approved!</h1>
          </div>
          <div class="body">
            <p>Hi <strong>${toName}</strong>,</p>
            <p>Great news! Your business <strong>"${businessName}"</strong> has been reviewed and <strong style="color: #059669;">approved</strong> by the Verso Air team.</p>
            <p>Your business is now live in the directory and visible to all users.</p>
            ${notes ? `<div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;"><strong>Admin Note:</strong> ${notes}</div>` : ""}
            <div style="text-align: center; margin: 24px 0;">
              <a href="${appUrl}/geo-admin" class="button">View Your Business</a>
            </div>
          </div>
          <div class="footer">
            <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
            <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(toEmail, subject, htmlContent);
}

/**
 * Send notification to submitter when business is rejected
 */
export async function sendBusinessRejectedEmail(
  toEmail: string,
  toName: string,
  businessName: string,
  reason?: string,
): Promise<boolean> {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const subject = `❌ Your business "${businessName}" registration was not approved`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
          .body { background: white; padding: 32px 24px; }
          .button { display: inline-block; background: #bf831c; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
            <h1>Registration Not Approved</h1>
          </div>
          <div class="body">
            <p>Hi <strong>${toName}</strong>,</p>
            <p>We're sorry, but your business <strong>"${businessName}"</strong> registration was <strong style="color: #dc2626;">not approved</strong> at this time.</p>
            ${reason ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;"><strong>Reason:</strong> ${reason}</div>` : ""}
            <p>You can make corrections and resubmit your business registration through the GeoAdmin dashboard.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${appUrl}/geo-admin" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
            <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(toEmail, subject, htmlContent);
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL SUBSCRIPTION TEMPLATES — 4 Channel Follow-Up System
// ══════════════════════════════════════════════════════════════════════════════

/** Shared branded wrapper for all subscription emails */
function wrapInBrandedTemplate(
  headerEmoji: string,
  headerTitle: string,
  headerGradient: string,
  accentColor: string,
  bodyHtml: string,
  unsubscribeUrl: string,
): string {
  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${headerGradient}; color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .header-icon { font-size: 40px; margin-bottom: 8px; }
    .body { background: white; padding: 32px 24px; }
    .button { display: inline-block; background: ${accentColor}; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .card { background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid ${accentColor}; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 12px 0; }
    .card h3 { margin: 0 0 6px; font-size: 16px; color: #1a1a2e; }
    .card p { margin: 0; font-size: 14px; color: #555; }
    .card .meta { font-size: 12px; color: #888; margin-top: 6px; }
    .badge { display: inline-block; background: ${accentColor}22; color: ${accentColor}; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .stat-label { color: #666; font-size: 14px; }
    .stat-value { font-weight: 700; color: #1a1a2e; font-size: 14px; }
    .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
    .footer a { color: ${accentColor}; text-decoration: none; }
    .unsubscribe { margin-top: 16px; padding-top: 16px; border-top: 1px solid #333; }
    .divider { height: 1px; background: #e9ecef; margin: 24px 0; }
    @media (max-width: 480px) {
      .container { padding: 8px; }
      .header, .body { padding: 20px 16px; }
      .card { padding: 12px 14px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">${headerEmoji}</div>
      <h1>${headerTitle}</h1>
      <p>Verso Air Business Intelligence</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
      <p>Connecting African businesses with global opportunities</p>
      <div class="unsubscribe">
        <p>You're receiving this because you subscribed to updates on Verso Air.</p>
        <p><a href="${unsubscribeUrl}">Unsubscribe</a> · <a href="${appUrl}/settings">Manage Preferences</a></p>
      </div>
      <p>&copy; ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── 1. JOB ALERTS (Career Page — Blue Theme) ───────────────────────────────

export interface JobAlertData {
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string; // Full-time, Part-time, etc.
  postedAt: string;
  url: string;
}

/**
 * Send job alert email — triggered by new matching job postings
 * Blue theme (#2563eb)
 */
export async function sendJobAlertEmail(
  toEmail: string,
  toName: string,
  jobs: JobAlertData[],
  unsubscribeUrl: string,
): Promise<boolean> {
  const jobCount = jobs.length;
  const subject = `🎯 ${jobCount} new job${jobCount > 1 ? "s" : ""} matching your preferences — Verso Air`;

  const jobCards = jobs
    .slice(0, 10)
    .map(
      (job) => `
    <div class="card">
      <h3>${job.title}</h3>
      <p>${job.company} · ${job.location}</p>
      <div class="meta">
        <span class="badge">${job.type}</span>
        ${job.salary ? ` · ${job.salary}` : ""}
        · Posted ${job.postedAt}
      </div>
    </div>`,
    )
    .join("");

  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const bodyHtml = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>We found <strong>${jobCount} new position${jobCount > 1 ? "s" : ""}</strong> that match your job alert preferences:</p>
    <div class="divider"></div>
    ${jobCards}
    ${jobCount > 10 ? `<p style="text-align: center; color: #888; font-size: 14px;">+ ${jobCount - 10} more positions</p>` : ""}
    <div class="divider"></div>
    <div style="text-align: center;">
      <a href="${appUrl}/services/careers" class="button">View All Jobs</a>
    </div>
    <p style="font-size: 13px; color: #888; margin-top: 20px;">💡 Tip: Refine your filters to get more targeted alerts.</p>
  `;

  const html = wrapInBrandedTemplate(
    "🎯",
    "New Job Matches",
    "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    "#2563eb",
    bodyHtml,
    unsubscribeUrl,
  );

  return sendEmail(toEmail, subject, html);
}

// ── 2. CONTRACT ALERTS (Contractors Page — Amber Theme) ─────────────────────

export interface ContractAlertData {
  title: string;
  client: string;
  location: string;
  budget?: string;
  duration?: string;
  skills: string[];
  postedAt: string;
  url: string;
}

/**
 * Send contract alert email — triggered by new matching contracts
 * Amber theme (#d97706)
 */
export async function sendContractAlertEmail(
  toEmail: string,
  toName: string,
  contracts: ContractAlertData[],
  unsubscribeUrl: string,
): Promise<boolean> {
  const count = contracts.length;
  const subject = `🔨 ${count} new contract${count > 1 ? "s" : ""} for your expertise — Verso Air`;

  const contractCards = contracts
    .slice(0, 8)
    .map(
      (c) => `
    <div class="card">
      <h3>${c.title}</h3>
      <p>${c.client} · ${c.location}</p>
      <div class="meta">
        ${c.budget ? `<span class="badge">${c.budget}</span> · ` : ""}
        ${c.duration ? `${c.duration} · ` : ""}
        ${c.skills.slice(0, 3).join(", ")}
        · Posted ${c.postedAt}
      </div>
    </div>`,
    )
    .join("");

  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const bodyHtml = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p><strong>${count} new contract${count > 1 ? "s" : ""}</strong> just landed that match your skills and preferences:</p>
    <div class="divider"></div>
    ${contractCards}
    ${count > 8 ? `<p style="text-align: center; color: #888; font-size: 14px;">+ ${count - 8} more contracts</p>` : ""}
    <div class="divider"></div>
    <div style="text-align: center;">
      <a href="${appUrl}/services/contractors" class="button">Browse All Contracts</a>
    </div>
    <p style="font-size: 13px; color: #888; margin-top: 20px;">⚡ Quick Apply is available for most contracts — don't miss out!</p>
  `;

  const html = wrapInBrandedTemplate(
    "🔨",
    "New Contract Opportunities",
    "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    "#d97706",
    bodyHtml,
    unsubscribeUrl,
  );

  return sendEmail(toEmail, subject, html);
}

// ── 3. RESERVATION UPDATES (Booking Tracking — Green Theme) ─────────────────

export interface ReservationUpdateData {
  reservationId: string;
  businessName: string;
  date: string;
  time?: string;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "modified";
  guestCount?: number;
  totalPrice?: string;
  updateMessage?: string;
}

/**
 * Send reservation update email — triggered by booking status changes
 * Green theme (#059669)
 */
export async function sendReservationUpdateEmail(
  toEmail: string,
  toName: string,
  reservation: ReservationUpdateData,
  unsubscribeUrl: string,
): Promise<boolean> {
  const statusEmojis: Record<string, string> = {
    confirmed: "✅",
    pending: "⏳",
    cancelled: "❌",
    completed: "🎉",
    modified: "📝",
  };

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed",
    pending: "Pending Confirmation",
    cancelled: "Cancelled",
    completed: "Completed",
    modified: "Modified",
  };

  const emoji = statusEmojis[reservation.status] || "📋";
  const label = statusLabels[reservation.status] || reservation.status;
  const subject = `${emoji} Reservation ${label} — ${reservation.businessName}`;

  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const bodyHtml = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>Your reservation has been updated:</p>
    <div class="divider"></div>
    <div class="card">
      <h3>${reservation.businessName}</h3>
      <p style="font-size: 18px; font-weight: 700; color: #059669; margin: 8px 0;">
        ${emoji} ${label}
      </p>
      <div style="margin-top: 12px;">
        <div class="stat-row">
          <span class="stat-label">📅 Date</span>
          <span class="stat-value">${reservation.date}</span>
        </div>
        ${reservation.time ? `<div class="stat-row"><span class="stat-label">🕐 Time</span><span class="stat-value">${reservation.time}</span></div>` : ""}
        ${reservation.guestCount ? `<div class="stat-row"><span class="stat-label">👥 Guests</span><span class="stat-value">${reservation.guestCount}</span></div>` : ""}
        ${reservation.totalPrice ? `<div class="stat-row"><span class="stat-label">💰 Total</span><span class="stat-value">${reservation.totalPrice}</span></div>` : ""}
        <div class="stat-row" style="border-bottom: none;">
          <span class="stat-label">🔖 Reference</span>
          <span class="stat-value">#${reservation.reservationId}</span>
        </div>
      </div>
    </div>
    ${reservation.updateMessage ? `<div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; color: #065f46;"><strong>Note:</strong> ${reservation.updateMessage}</div>` : ""}
    <div class="divider"></div>
    <div style="text-align: center;">
      <a href="${appUrl}/reservations" class="button">View My Reservations</a>
    </div>
  `;

  const html = wrapInBrandedTemplate(
    emoji,
    `Reservation ${label}`,
    "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "#059669",
    bodyHtml,
    unsubscribeUrl,
  );

  return sendEmail(toEmail, subject, html);
}

// ── 4. GEOADMIN REPORTS (Market Study Digest — Purple Theme) ────────────────

export interface GeoAdminReportData {
  reportTitle: string;
  period: string;
  metrics: Array<{
    label: string;
    value: string;
    change?: string;
    trend?: "up" | "down" | "stable";
  }>;
  topBusinesses?: Array<{ name: string; sector: string; rating: string }>;
  insights?: string[];
  exportUrl?: string;
}

/**
 * Send GeoAdmin market study / report email — scheduled digest for subscribers
 * Purple theme (#7c3aed)
 */
export async function sendGeoAdminReportEmail(
  toEmail: string,
  toName: string,
  report: GeoAdminReportData,
  unsubscribeUrl: string,
): Promise<boolean> {
  const subject = `📊 ${report.reportTitle} — Verso Air Market Intelligence`;

  const metricsHtml = report.metrics
    .map(
      (m) => `
    <div class="stat-row">
      <span class="stat-label">${m.label}</span>
      <span class="stat-value">
        ${m.value}
        ${m.change ? `<span style="font-size: 12px; color: ${m.trend === "up" ? "#059669" : m.trend === "down" ? "#dc2626" : "#888"}; margin-left: 6px;">${m.trend === "up" ? "▲" : m.trend === "down" ? "▼" : "●"} ${m.change}</span>` : ""}
      </span>
    </div>`,
    )
    .join("");

  const topBusinessesHtml =
    report.topBusinesses && report.topBusinesses.length > 0
      ? `
    <div class="divider"></div>
    <h3 style="margin: 0 0 12px; color: #1a1a2e;">🏆 Top Performers</h3>
    ${report.topBusinesses
      .slice(0, 5)
      .map(
        (b, i) => `
      <div class="card">
        <h3>${i + 1}. ${b.name}</h3>
        <p><span class="badge">${b.sector}</span> · ⭐ ${b.rating}</p>
      </div>`,
      )
      .join("")}`
      : "";

  const insightsHtml =
    report.insights && report.insights.length > 0
      ? `
    <div class="divider"></div>
    <h3 style="margin: 0 0 12px; color: #1a1a2e;">💡 Key Insights</h3>
    <ul style="padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
      ${report.insights.map((i) => `<li>${i}</li>`).join("")}
    </ul>`
      : "";

  const appUrl =
    process.env.VITE_API_URL ||
    process.env.VERSOAIR_URL ||
    "http://localhost:5003";

  const bodyHtml = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>Your <strong>${report.period}</strong> market intelligence report is ready:</p>
    <div class="divider"></div>
    <h3 style="margin: 0 0 12px; color: #1a1a2e;">📈 Key Metrics</h3>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
      ${metricsHtml}
    </div>
    ${topBusinessesHtml}
    ${insightsHtml}
    <div class="divider"></div>
    <div style="text-align: center;">
      ${report.exportUrl ? `<a href="${report.exportUrl}" class="button" style="margin-right: 12px; background: #6d28d9;">📥 Download Report</a>` : ""}
      <a href="${appUrl}/geo-admin" class="button">Open Dashboard</a>
    </div>
    <p style="font-size: 13px; color: #888; margin-top: 20px;">🔐 This report is exclusive to your GeoAdmin subscription tier.</p>
  `;

  const html = wrapInBrandedTemplate(
    "📊",
    report.reportTitle,
    "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    "#7c3aed",
    bodyHtml,
    unsubscribeUrl,
  );

  return sendEmail(toEmail, subject, html);
}

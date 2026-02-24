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

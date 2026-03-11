import { Router, Request, Response } from "express";
import { sendEmail } from "../services/email-service";

const router = Router();

const ADMIN_EMAIL =
  process.env.SMTP_USER || process.env.ADMIN_EMAIL || "luqjoey@gmail.com";

const APP_URL =
  process.env.VITE_API_URL ||
  process.env.VERSOAIR_URL ||
  "http://localhost:5003";

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/request/business — Email-only business submission (no DB insert)
// ══════════════════════════════════════════════════════════════════════════════
router.post("/business", async (req: Request, res: Response) => {
  try {
    const {
      name,
      categoryId,
      categoryName,
      businessType,
      countryCode,
      cityName,
      regionName,
      address,
      phone,
      email,
      description,
      latitude,
      longitude,
      username,
    } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Business name is required" });
    }

    const refId = `REQ-BIZ-${Date.now().toString(36).toUpperCase()}`;

    const subject = `📋 New Business Request — ${name} (${refId})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #bf831c 0%, #d4a037 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 22px; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .body { background: white; padding: 32px 24px; }
            .field { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; }
            .field-label { color: #666; font-size: 14px; min-width: 130px; font-weight: 600; }
            .field-value { color: #1a1a2e; font-size: 14px; }
            .badge { display: inline-block; background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; background: #bf831c; color: white !important; }
            .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Business Registration Request</h1>
              <p>A new business submission requires your review</p>
            </div>
            <div class="body">
              <p>Hi Admin,</p>
              <p>A GeoAdmin user has submitted a business registration request. Please review the details below and take the appropriate action in the Admin Dashboard.</p>

              <div style="background: #f8f9fa; border-left: 4px solid #bf831c; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px; color: #1a1a2e;">${name}</h3>
                <span class="badge">⏳ Pending Review</span>
              </div>

              <div style="margin: 20px 0;">
                <div class="field"><span class="field-label">Reference</span><span class="field-value">${refId}</span></div>
                <div class="field"><span class="field-label">Category</span><span class="field-value">${categoryName || `ID: ${categoryId}` || "—"}</span></div>
                ${businessType ? `<div class="field"><span class="field-label">Business Type</span><span class="field-value">${businessType}</span></div>` : ""}
                ${description ? `<div class="field"><span class="field-label">Description</span><span class="field-value">${description}</span></div>` : ""}
                <div class="field"><span class="field-label">Country</span><span class="field-value">${countryCode || "—"}</span></div>
                ${regionName ? `<div class="field"><span class="field-label">Region</span><span class="field-value">${regionName}</span></div>` : ""}
                ${cityName ? `<div class="field"><span class="field-label">City</span><span class="field-value">${cityName}</span></div>` : ""}
                ${address ? `<div class="field"><span class="field-label">Address</span><span class="field-value">${address}</span></div>` : ""}
                ${phone ? `<div class="field"><span class="field-label">Phone</span><span class="field-value">${phone}</span></div>` : ""}
                ${email ? `<div class="field"><span class="field-label">Email</span><span class="field-value">${email}</span></div>` : ""}
                ${latitude && longitude ? `<div class="field"><span class="field-label">Coordinates</span><span class="field-value">${latitude}, ${longitude}</span></div>` : ""}
                <div class="field" style="border-bottom: none;"><span class="field-label">Submitted By</span><span class="field-value">${username || "GeoAdmin User"}</span></div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${APP_URL}/geo-admin/dashboard" class="btn">Review in Dashboard</a>
              </div>

              <p style="font-size: 13px; color: #888; text-align: center;">
                To add this business, log into the Admin Dashboard and create it manually after review.
              </p>
            </div>
            <div class="footer">
              <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
              <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sent = await sendEmail(ADMIN_EMAIL, subject, htmlContent);

    if (!sent) {
      console.warn(
        `[REQUEST] Business request email not sent (SMTP may be unconfigured). Ref: ${refId}`,
      );
    }

    console.log(
      `[REQUEST] Business request received: "${name}" by ${username || "unknown"}. Ref: ${refId}. Email sent: ${sent}`,
    );

    res.status(200).json({
      success: true,
      message:
        "Your business registration request has been submitted. The admin team will review it and get back to you.",
      referenceId: refId,
      emailSent: sent,
    });
  } catch (error: any) {
    console.error("[REQUEST] Business request error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit business request. Please try again.",
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/request/artist — Email-only artist submission (no DB insert)
// ══════════════════════════════════════════════════════════════════════════════
router.post("/artist", async (req: Request, res: Response) => {
  try {
    const { stageName, genre, labelStatus, spotifyUrl, countryCode, username } =
      req.body;

    if (!stageName?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Stage name is required" });
    }

    const refId = `REQ-ART-${Date.now().toString(36).toUpperCase()}`;

    const subject = `🎤 New Artist Request — ${stageName} (${refId})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 22px; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .body { background: white; padding: 32px 24px; }
            .field { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; }
            .field-label { color: #666; font-size: 14px; min-width: 130px; font-weight: 600; }
            .field-value { color: #1a1a2e; font-size: 14px; }
            .badge { display: inline-block; background: #ede9fe; color: #6d28d9; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; background: #7c3aed; color: white !important; }
            .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎤 Artist Registration Request</h1>
              <p>A new artist submission requires your review</p>
            </div>
            <div class="body">
              <p>Hi Admin,</p>
              <p>A new artist has been submitted for registration on the Verso Air Music Directory. Please review the details below.</p>

              <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px; color: #1a1a2e;">🎵 ${stageName}</h3>
                <span class="badge">⏳ Pending Review</span>
              </div>

              <div style="margin: 20px 0;">
                <div class="field"><span class="field-label">Reference</span><span class="field-value">${refId}</span></div>
                ${genre ? `<div class="field"><span class="field-label">Genre</span><span class="field-value">${genre}</span></div>` : ""}
                <div class="field"><span class="field-label">Label Status</span><span class="field-value">${labelStatus || "unsigned"}</span></div>
                ${countryCode ? `<div class="field"><span class="field-label">Country</span><span class="field-value">${countryCode}</span></div>` : ""}
                ${spotifyUrl ? `<div class="field"><span class="field-label">Spotify</span><span class="field-value"><a href="${spotifyUrl}" style="color: #1db954;">${spotifyUrl}</a></span></div>` : ""}
                <div class="field" style="border-bottom: none;"><span class="field-label">Submitted By</span><span class="field-value">${username || "GeoAdmin User"}</span></div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${APP_URL}/geo-admin/dashboard" class="btn">Review in Dashboard</a>
              </div>

              <p style="font-size: 13px; color: #888; text-align: center;">
                To add this artist, log into the Admin Dashboard and create the entry manually after review.
              </p>
            </div>
            <div class="footer">
              <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
              <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sent = await sendEmail(ADMIN_EMAIL, subject, htmlContent);

    if (!sent) {
      console.warn(
        `[REQUEST] Artist request email not sent (SMTP may be unconfigured). Ref: ${refId}`,
      );
    }

    console.log(
      `[REQUEST] Artist request received: "${stageName}" by ${username || "unknown"}. Ref: ${refId}. Email sent: ${sent}`,
    );

    res.status(200).json({
      success: true,
      message:
        "Your artist registration request has been submitted. The admin team will review it and get back to you.",
      referenceId: refId,
      emailSent: sent,
    });
  } catch (error: any) {
    console.error("[REQUEST] Artist request error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit artist request. Please try again.",
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/request/job — Email-only job submission (no DB insert)
// ══════════════════════════════════════════════════════════════════════════════
router.post("/job", async (req: Request, res: Response) => {
  try {
    const {
      title,
      company,
      location,
      type,
      sector,
      countryCode,
      description,
      experienceLevel,
      isRemote,
      username,
    } = req.body;

    if (!title?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Job title is required" });
    }
    if (!company?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Company name is required" });
    }

    const refId = `REQ-JOB-${Date.now().toString(36).toUpperCase()}`;

    const subject = `💼 New Job Request — ${title} at ${company} (${refId})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 22px; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .body { background: white; padding: 32px 24px; }
            .field { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; }
            .field-label { color: #666; font-size: 14px; min-width: 130px; font-weight: 600; }
            .field-value { color: #1a1a2e; font-size: 14px; }
            .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; background: #2563eb; color: white !important; }
            .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💼 Job Listing Request</h1>
              <p>A new job submission requires your review</p>
            </div>
            <div class="body">
              <p>Hi Admin,</p>
              <p>A GeoAdmin user has submitted a job listing request. Please review the details below and take the appropriate action in the Admin Dashboard.</p>

              <div style="background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 4px; color: #1a1a2e;">${title}</h3>
                <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">${company}</p>
                <span class="badge">⏳ Pending Review</span>
              </div>

              <div style="margin: 20px 0;">
                <div class="field"><span class="field-label">Reference</span><span class="field-value">${refId}</span></div>
                <div class="field"><span class="field-label">Job Title</span><span class="field-value">${title}</span></div>
                <div class="field"><span class="field-label">Company</span><span class="field-value">${company}</span></div>
                ${type ? `<div class="field"><span class="field-label">Type</span><span class="field-value">${type}</span></div>` : ""}
                ${sector ? `<div class="field"><span class="field-label">Sector</span><span class="field-value">${sector}</span></div>` : ""}
                ${location ? `<div class="field"><span class="field-label">Location</span><span class="field-value">${location}</span></div>` : ""}
                ${countryCode ? `<div class="field"><span class="field-label">Country</span><span class="field-value">${countryCode}</span></div>` : ""}
                ${experienceLevel ? `<div class="field"><span class="field-label">Experience</span><span class="field-value">${experienceLevel}</span></div>` : ""}
                <div class="field"><span class="field-label">Remote</span><span class="field-value">${isRemote ? "Yes ✅" : "No"}</span></div>
                ${description ? `<div class="field"><span class="field-label">Description</span><span class="field-value">${description}</span></div>` : ""}
                <div class="field" style="border-bottom: none;"><span class="field-label">Submitted By</span><span class="field-value">${username || "GeoAdmin User"}</span></div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${APP_URL}/geo-admin/dashboard" class="btn">Review in Dashboard</a>
              </div>

              <p style="font-size: 13px; color: #888; text-align: center;">
                To add this job listing, log into the Admin Dashboard and create the entry manually after review.
              </p>
            </div>
            <div class="footer">
              <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
              <p>© ${new Date().getFullYear()} Verso Air. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sent = await sendEmail(ADMIN_EMAIL, subject, htmlContent);

    if (!sent) {
      console.warn(
        `[REQUEST] Job request email not sent (SMTP may be unconfigured). Ref: ${refId}`,
      );
    }

    console.log(
      `[REQUEST] Job request received: "${title}" at "${company}" by ${username || "unknown"}. Ref: ${refId}. Email sent: ${sent}`,
    );

    res.status(200).json({
      success: true,
      message:
        "Your job listing request has been submitted. The admin team will review it and get back to you.",
      referenceId: refId,
      emailSent: sent,
    });
  } catch (error: any) {
    console.error("[REQUEST] Job request error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit job request. Please try again.",
    });
  }
});

export default router;

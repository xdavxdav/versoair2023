import { randomBytes } from "node:crypto";
import { Router, type Request, type RequestHandler, type Response } from "express";
import { sendEmail } from "../services/email-service";
import { notifyZapier, type ZapierEventCategory } from "../services/zapier-notify";
import { pool } from "../db";
import {
  denyGeoAdminSubscriberMutation,
  optionalAuth,
} from "../middleware/auth";
import {
  multiLine,
  oneLine,
  renderRequestEmail,
  type RequestEmailKind,
} from "../utils/request-email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";

const APP_URL =
  process.env.VITE_API_URL ||
  process.env.VERSOAIR_URL ||
  "http://localhost:5003";

// Repeat submissions from the same sender are ignored for this long.
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

const DUPLICATE_MESSAGE =
  "Duplicate submission detected. Please wait 5 minutes before resubmitting.";
const NOT_RECORDED_MESSAGE =
  "We could not save your request right now, so nothing was sent. Please try again in a few minutes.";

export interface TicketRecord {
  title: string;
  description: string;
  category: string;
  source: string;
  reporter: string;
  requesterEmail: string | null;
  /** The signed-in account, so the request shows up in that user's own tickets. */
  reporterId: number | null;
}

export interface SubmissionRequestDeps {
  sendEmail: (to: string, subject: string, html: string) => Promise<boolean>;
  insertTicket: (ticket: TicketRecord) => Promise<void>;
  adminEmail: string;
  appUrl: string;
  now: () => number;
  /** Tells Zapier about an accepted request; a no-op until ZAPIER_WEBHOOK_URL is set. */
  notify?: (category: ZapierEventCategory, payload: Record<string, unknown>) => void;
}

const defaultDeps: SubmissionRequestDeps = {
  sendEmail: (to, subject, html) => sendEmail(to, subject, html),
  insertTicket: async (ticket) => {
    await pool.query(
      `INSERT INTO tickets (title, description, status, priority, category, reporter, reporter_id, requester_email, source, sla_target_hours, sla_due_at, sla_breached, created_at, updated_at)
       VALUES ($1, $2, 'open', 'medium', $3, $4, $5, $6, $7, 24, NOW() + INTERVAL '24 hours', false, NOW(), NOW())`,
      [
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.reporter,
        ticket.reporterId,
        ticket.requesterEmail,
        ticket.source,
      ],
    );
  },
  adminEmail: ADMIN_EMAIL,
  appUrl: APP_URL,
  now: () => Date.now(),
  notify: notifyZapier,
};

type Body = Record<string, unknown>;

interface Submission {
  kind: RequestEmailKind;
  dedupeKey: string;
  refId: string;
  subject: string;
  html: string;
  ticket: TicketRecord;
  successMessage: string;
  logLabel: string;
  /** Labels only: no email, phone or description ever goes to Zapier from here. */
  automation: {
    category: ZapierEventCategory;
    payload: Record<string, unknown>;
  };
}

type Built = Submission | { invalid: string };

function bodyOf(req: Request): Body {
  return req.body && typeof req.body === "object" ? (req.body as Body) : {};
}

function joinLines(lines: Array<string | false | null | undefined>): string {
  return lines.filter(Boolean).join("\n");
}

/**
 * The three "request" forms (business, artist, job) do not create records
 * themselves: an admin reviews each one. Each request is emailed to the admin
 * team AND saved as a ticket, and the visitor is only told it went through when
 * at least one of the two worked.
 */
export function createSubmissionRequestsRouter(
  deps: SubmissionRequestDeps = defaultDeps,
): Router {
  const router = Router();
  const recent = new Map<string, number>();

  function claim(key: string): boolean {
    const now = deps.now();
    for (const [existing, at] of recent) {
      if (now - at >= DEDUP_WINDOW_MS) recent.delete(existing);
    }
    if (recent.has(key)) return false;
    recent.set(key, now);
    return true;
  }

  function senderKey(req: Request): string {
    return req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip ?? "unknown"}`;
  }

  function submittedBy(req: Request, username: unknown): string {
    const claimed = oneLine(username, 100);
    if (req.user) {
      const account = `${req.user.email} (user #${req.user.userId})`;
      return claimed ? `${claimed} — ${account}` : account;
    }
    return claimed ? `${claimed} (not signed in)` : "Anonymous visitor";
  }

  // Ties the ticket to the signed-in account; anonymous visitors leave both empty.
  function ticketOwner(req: Request): Pick<TicketRecord, "requesterEmail" | "reporterId"> {
    const id = Number(req.user?.userId);
    return {
      requesterEmail: req.user?.email ?? null,
      reporterId: Number.isInteger(id) && id > 0 ? id : null,
    };
  }

  function reference(prefix: string): string {
    const stamp = deps.now().toString(36).toUpperCase();
    return `${prefix}-${stamp}${randomBytes(2).toString("hex").toUpperCase()}`;
  }

  async function emailAdmins(submission: Submission): Promise<boolean> {
    if (!deps.adminEmail) {
      console.warn(
        `[REQUEST] No ADMIN_EMAIL or SMTP_USER is set, so ${submission.refId} was not emailed.`,
      );
      return false;
    }
    try {
      return await deps.sendEmail(
        deps.adminEmail,
        submission.subject,
        submission.html,
      );
    } catch (error) {
      console.warn(`[REQUEST] Email for ${submission.refId} failed:`, error);
      return false;
    }
  }

  async function recordTicket(submission: Submission): Promise<boolean> {
    try {
      await deps.insertTicket(submission.ticket);
      return true;
    } catch (error) {
      console.warn(`[REQUEST] Could not create ticket for ${submission.refId}:`, error);
      return false;
    }
  }

  async function complete(req: Request, res: Response, submission: Submission) {
    const key = `${submission.kind}:${senderKey(req)}:${submission.dedupeKey.toLowerCase()}`;
    if (!claim(key)) {
      return res.status(429).json({
        success: false,
        code: "DUPLICATE_SUBMISSION",
        error: DUPLICATE_MESSAGE,
      });
    }

    try {
      const [emailSent, recorded] = await Promise.all([
        emailAdmins(submission),
        recordTicket(submission),
      ]);

      if (!emailSent && !recorded) {
        // Nothing reached the admin team: let the visitor try again straight away.
        recent.delete(key);
        console.error(
          `[REQUEST] ${submission.logLabel} (${submission.refId}) was neither emailed nor saved.`,
        );
        return res.status(503).json({
          success: false,
          code: "SUBMISSION_NOT_RECORDED",
          error: NOT_RECORDED_MESSAGE,
        });
      }

      console.log(
        `[REQUEST] ${submission.logLabel}. Ref: ${submission.refId}. Email sent: ${emailSent}. Saved: ${recorded}`,
      );

      try {
        deps.notify?.(submission.automation.category, submission.automation.payload);
      } catch (error) {
        console.warn(`[REQUEST] Zapier notice for ${submission.refId} failed:`, error);
      }

      return res.status(200).json({
        success: true,
        message: submission.successMessage,
        referenceId: submission.refId,
        emailSent,
        recorded,
      });
    } catch (error) {
      recent.delete(key);
      console.error(`[REQUEST] ${submission.logLabel} error:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to submit ${submission.kind} request. Please try again.`,
      });
    }
  }

  // Routes below declare their path inline rather than through a registration
  // helper, because scripts/check-api-contract.cjs finds server routes by
  // scanning for that literal form.
  function handle(
    kind: RequestEmailKind,
    build: (req: Request, body: Body) => Built,
  ): RequestHandler {
    return async (req: Request, res: Response) => {
      try {
        const built = build(req, bodyOf(req));
        if ("invalid" in built) {
          return res.status(400).json({ success: false, error: built.invalid });
        }
        return await complete(req, res, built);
      } catch (error) {
        console.error(`[REQUEST] ${kind} request error:`, error);
        return res.status(500).json({
          success: false,
          error: `Failed to submit ${kind} request. Please try again.`,
        });
      }
    };
  }

  // ── POST /api/request/business ──────────────────────────────────────────────
  router.post("/business", optionalAuth, handle("business", (req, body) => {
    const name = oneLine(body.name);
    if (!name) return { invalid: "Business name is required" };

    const categoryName = oneLine(body.categoryName);
    const categoryId = oneLine(body.categoryId, 20);
    const category = categoryName || (categoryId ? `ID: ${categoryId}` : "");
    const businessType = oneLine(body.businessType);
    const description = multiLine(body.description);
    const countryCode = oneLine(body.countryCode, 10);
    const regionName = oneLine(body.regionName);
    const cityName = oneLine(body.cityName);
    const address = oneLine(body.address, 300);
    const phone = oneLine(body.phone, 40);
    const email = oneLine(body.email, 200);
    const latitude = oneLine(body.latitude, 30);
    const longitude = oneLine(body.longitude, 30);
    const by = submittedBy(req, body.username);
    const refId = reference("REQ-BIZ");

    return {
      kind: "business",
      dedupeKey: name,
      refId,
      subject: `📋 New Business Request — ${name} (${refId})`,
      html: renderRequestEmail({
        kind: "business",
        heading: "📋 Business Registration Request",
        subheading: "A new business submission requires your review",
        intro:
          "A business registration request has been submitted. Please review the details below and take the appropriate action in the Admin Dashboard.",
        title: name,
        refId,
        fields: [
          { label: "Category", value: category || "—" },
          { label: "Business Type", value: businessType },
          { label: "Description", value: description },
          { label: "Country", value: countryCode || "—" },
          { label: "Region", value: regionName },
          { label: "City", value: cityName },
          { label: "Address", value: address },
          { label: "Phone", value: phone },
          { label: "Email", value: email },
          {
            label: "Coordinates",
            value: latitude && longitude ? `${latitude}, ${longitude}` : "",
          },
          { label: "Submitted By", value: by },
        ],
        note: req.user
          ? "To add this business, log into the Admin Dashboard and create it manually after review. Then set the requester's role to Business Owner so the Careers portal unlocks for them."
          : "To add this business, log into the Admin Dashboard and create it manually after review.",
        dashboardUrl: `${deps.appUrl}/geo-admin/dashboard`,
      }),
      ticket: {
        title: `📋 Business Request: ${name}`,
        description: joinLines([
          `Reference: ${refId}`,
          `Category: ${category || "N/A"}`,
          businessType && `Type: ${businessType}`,
          `Location: ${[cityName, regionName, countryCode].filter(Boolean).join(", ") || "N/A"}`,
          address && `Address: ${address}`,
          phone && `Phone: ${phone}`,
          email && `Email: ${email}`,
          description && `Description: ${description}`,
          `Submitted by: ${by}`,
          req.user &&
            "On approval: the listing is created and the requester's role is set to Business Owner (this unlocks the Careers portal).",
        ]),
        category: "business-request",
        source: "business-submission",
        reporter: by,
        ...ticketOwner(req),
      },
      successMessage:
        "Your business registration request has been submitted. The admin team will review it and get back to you.",
      logLabel: `Business request "${name}"`,
      automation: {
        category: "business_request",
        payload: {
          referenceId: refId,
          businessName: name,
          // Not "category": the webhook body already uses that key for the event category.
          businessCategory: category || null,
          countryCode: countryCode || null,
          city: cityName || null,
        },
      },
    };
  }));

  // ── POST /api/request/artist ────────────────────────────────────────────────
  router.post(
    "/artist",
    optionalAuth,
    denyGeoAdminSubscriberMutation,
    handle("artist", (req, body) => {
      const stageName = oneLine(body.stageName);
      if (!stageName) return { invalid: "Stage name is required" };

      const genre = oneLine(body.genre);
      const labelStatus = oneLine(body.labelStatus, 50) || "unsigned";
      const spotifyUrl = oneLine(body.spotifyUrl, 500);
      const countryCode = oneLine(body.countryCode, 10);
      const by = submittedBy(req, body.username);
      const refId = reference("REQ-ART");

      return {
        kind: "artist",
        dedupeKey: stageName,
        refId,
        subject: `🎤 New Artist Request — ${stageName} (${refId})`,
        html: renderRequestEmail({
          kind: "artist",
          heading: "🎤 Artist Registration Request",
          subheading: "A new artist submission requires your review",
          intro:
            "A new artist has been submitted for registration on the Verso Air Music Directory. Please review the details below.",
          title: `🎵 ${stageName}`,
          refId,
          fields: [
            { label: "Genre", value: genre },
            { label: "Label Status", value: labelStatus },
            { label: "Country", value: countryCode },
            { label: "Spotify", value: spotifyUrl, link: true },
            { label: "Submitted By", value: by },
          ],
          note: "To add this artist, log into the Admin Dashboard and create the entry manually after review.",
          dashboardUrl: `${deps.appUrl}/geo-admin/dashboard`,
        }),
        ticket: {
          title: `🎤 Artist Request: ${stageName}`,
          description: joinLines([
            `Reference: ${refId}`,
            `Genre: ${genre || "N/A"}`,
            `Label: ${labelStatus}`,
            `Country: ${countryCode || "N/A"}`,
            `Spotify: ${spotifyUrl || "N/A"}`,
            `Submitted by: ${by}`,
          ]),
          category: "music-request",
          source: "artist-submission",
          reporter: by,
          ...ticketOwner(req),
        },
        successMessage:
          "Your artist registration request has been submitted. The admin team will review it and get back to you.",
        logLabel: `Artist request "${stageName}"`,
        automation: {
          category: "artist_request",
          payload: {
            referenceId: refId,
            stageName,
            genre: genre || null,
            countryCode: countryCode || null,
          },
        },
      };
    }),
  );

  // ── POST /api/request/job ───────────────────────────────────────────────────
  router.post(
    "/job",
    optionalAuth,
    denyGeoAdminSubscriberMutation,
    handle("job", (req, body) => {
      const title = oneLine(body.title);
      if (!title) return { invalid: "Job title is required" };
      const company = oneLine(body.company);
      if (!company) return { invalid: "Company name is required" };

      const jobType = oneLine(body.type, 50);
      const sector = oneLine(body.sector, 100);
      const location = oneLine(body.location);
      const countryCode = oneLine(body.countryCode, 10);
      const experienceLevel = oneLine(body.experienceLevel, 50);
      const description = multiLine(body.description);
      const isRemote = body.isRemote === true || body.isRemote === "true";
      const by = submittedBy(req, body.username);
      const refId = reference("REQ-JOB");

      return {
        kind: "job",
        dedupeKey: `${title}:${company}`,
        refId,
        subject: `💼 New Job Request — ${title} at ${company} (${refId})`,
        html: renderRequestEmail({
          kind: "job",
          heading: "💼 Job Listing Request",
          subheading: "A new job submission requires your review",
          intro:
            "A job listing request has been submitted. Please review the details below and take the appropriate action in the Admin Dashboard.",
          title,
          subtitle: company,
          refId,
          fields: [
            { label: "Job Title", value: title },
            { label: "Company", value: company },
            { label: "Type", value: jobType },
            { label: "Sector", value: sector },
            { label: "Location", value: location },
            { label: "Country", value: countryCode },
            { label: "Experience", value: experienceLevel },
            { label: "Remote", value: isRemote ? "Yes ✅" : "No" },
            { label: "Description", value: description },
            { label: "Submitted By", value: by },
          ],
          note: "To add this job listing, log into the Admin Dashboard and create the entry manually after review.",
          dashboardUrl: `${deps.appUrl}/geo-admin/dashboard`,
        }),
        ticket: {
          title: `💼 Job Request: ${title} at ${company}`,
          description: joinLines([
            `Reference: ${refId}`,
            `Title: ${title}`,
            `Company: ${company}`,
            `Type: ${jobType || "N/A"}`,
            `Sector: ${sector || "N/A"}`,
            `Location: ${location || "N/A"}`,
            `Remote: ${isRemote ? "Yes" : "No"}`,
            `Submitted by: ${by}`,
          ]),
          category: "job-request",
          source: "job-submission",
          reporter: by,
          ...ticketOwner(req),
        },
        successMessage:
          "Your job listing request has been submitted. The admin team will review it and get back to you.",
        logLabel: `Job request "${title}" at "${company}"`,
        automation: {
          category: "job_request",
          payload: {
            referenceId: refId,
            jobTitle: title,
            company,
            countryCode: countryCode || null,
          },
        },
      };
    }),
  );

  return router;
}

export default createSubmissionRequestsRouter();

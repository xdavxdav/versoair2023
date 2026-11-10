import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Business Registration PDF Generator
 * Auto-generates a branded PDF when a business is submitted for approval.
 */

// In production containers /app is read-only; use /tmp instead
const UPLOADS_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "business-pdfs")
    : path.resolve("uploads", "business-pdfs");

// Ensure directory exists on startup (wrapped so a permission error never crashes the server)
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`⚠️  Could not create PDF uploads dir (${UPLOADS_DIR}):`, err);
}

export interface BusinessPDFData {
  id: number;
  name: string;
  categoryName?: string;
  description?: string;
  address?: string;
  cityName?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  submittedBy?: string; // username
  submittedAt?: string; // ISO date
  /** "pending" (the state at submission, and the default), "approved" or "rejected". */
  approvalStatus?: string;
  approvedBy?: string; // username
}

const STATUS_BADGES: Record<
  string,
  { label: string; background: string; color: string }
> = {
  // No emoji: the built-in PDF font cannot draw one and prints stray characters.
  pending: {
    label: "PENDING APPROVAL",
    background: "#fff3cd",
    color: "#856404",
  },
  approved: { label: "APPROVED", background: "#d4edda", color: "#155724" },
  rejected: { label: "REJECTED", background: "#f8d7da", color: "#721c24" },
};

/**
 * Generate a branded PDF for a business registration submission.
 * Returns the file path to the generated PDF.
 */
export async function generateBusinessPDF(
  data: BusinessPDFData,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = `business-reg-${data.id}-${Date.now()}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    drawRegistration(doc, data);
    doc.end();

    stream.on("finish", () => {
      console.log(`[PDF] Generated: ${filePath}`);
      resolve(filePath);
    });
    stream.on("error", (err) => {
      console.error("[PDF] Error generating PDF:", err);
      reject(err);
    });
  });
}

/**
 * Render the same document in memory. The host's disk is wiped on every
 * deploy, so a download is built from the database when it is asked for
 * instead of read back from a file that may be gone.
 */
export function renderBusinessPDF(data: BusinessPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawRegistration(doc, data);
    doc.end();
  });
}

function drawRegistration(doc: PDFKit.PDFDocument, data: BusinessPDFData) {
  // ── Brand colours ──
  const gold = "#bf831c";
  const darkBg = "#1a1a2e";
  const grey = "#555555";

  // ── Header banner ──
  doc.rect(0, 0, doc.page.width, 100).fill(darkBg);
  doc.fontSize(28).fill("#ffffff").text("Verso Air", 50, 30, { align: "left" });
  doc.fontSize(12).fill(gold).text("Business Registration Form", 50, 65, {
    align: "left",
  });

  // Reference & date (right-aligned in header)
  doc.fontSize(9).fill("#aaaaaa").text(`REF: VA-BIZ-${data.id}`, 350, 30, {
    align: "right",
    width: 195,
  });
  doc
    .fontSize(9)
    .fill("#aaaaaa")
    .text(
      `Date: ${data.submittedAt ? new Date(data.submittedAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}`,
      350,
      45,
      { align: "right", width: 195 },
    );

  // ── Status badge ── (anything unexpected is shown as pending, consistently)
  const requested = (data.approvalStatus || "pending").toLowerCase();
  const status = Object.hasOwn(STATUS_BADGES, requested)
    ? requested
    : "pending";
  const badge = STATUS_BADGES[status];
  const badgeY = 120;
  doc.roundedRect(50, badgeY, 140, 28, 4).fill(badge.background);
  doc
    .fontSize(11)
    .fill(badge.color)
    .text(badge.label, 58, badgeY + 7, { width: 130 });

  // ── Section: Business Details ──
  let y = drawSectionTitle(doc, "Business Details", badgeY + 55, gold);
  y = drawField(doc, "Business Name", data.name, y, grey);
  y = drawField(doc, "Category", data.categoryName || "—", y, grey);
  y = drawField(
    doc,
    "Description",
    data.description || "No description provided",
    y,
    grey,
  );

  // ── Section: Location ──
  y = drawSectionTitle(doc, "Location & Contact", y + 10, gold);
  y = drawField(doc, "Address", data.address || "—", y, grey);
  y = drawField(doc, "City", data.cityName || "—", y, grey);
  y = drawField(doc, "Country", data.countryCode || "—", y, grey);
  y = drawField(doc, "Phone", data.phone || "—", y, grey);
  y = drawField(doc, "Email", data.email || "—", y, grey);
  y = drawField(doc, "Website", data.website || "—", y, grey);

  // ── Section: Submission Info ──
  y = drawSectionTitle(doc, "Submission Information", y + 10, gold);
  y = drawField(doc, "Submitted By", data.submittedBy || "Unknown", y, grey);
  y = drawField(
    doc,
    "Submitted At",
    data.submittedAt
      ? new Date(data.submittedAt).toLocaleString("en-GB")
      : new Date().toLocaleString("en-GB"),
    y,
    grey,
  );
  y = drawField(doc, "Reference ID", `VA-BIZ-${data.id}`, y, grey);
  if (status !== "pending") {
    y = drawField(doc, "Reviewed By", data.approvedBy || "—", y, grey);
  }

  // ── Approval section (the sign-off box is only for a pending request) ──
  if (status === "pending") {
    y = ensureRoom(doc, y + 20, 90);
    doc
      .rect(50, y, doc.page.width - 100, 90)
      .lineWidth(1)
      .stroke("#dddddd");
    doc
      .fontSize(11)
      .fill(darkBg)
      .text("Approval Decision", 60, y + 10, { underline: true });
    doc
      .fontSize(10)
      .fill(grey)
      .text("Approved / Rejected (circle one)", 60, y + 30);
    doc.text("Approved by: ___________________________", 60, y + 50);
    doc.text("Date: _______________", 60, y + 70);
  }

  // ── Footer ── (it wraps onto two lines, so it must start well above the
  // bottom margin or PDFKit pushes it onto a page of its own)
  const footerY = doc.page.height - FOOTER_RESERVE + 20;
  doc
    .moveTo(50, footerY - 10)
    .lineTo(doc.page.width - 50, footerY - 10)
    .strokeColor("#dddddd")
    .stroke();
  doc
    .fontSize(8)
    .fill("#999999")
    .text(
      `© ${new Date().getFullYear()} Verso Air — Business Intelligence Platform  |  This document is auto-generated and serves as a formal business registration record.`,
      50,
      footerY,
      { align: "center", width: doc.page.width - 100 },
    );
}

/** Space kept clear at the bottom of every page for the footer. */
const FOOTER_RESERVE = 95;

/** Start a new page when the next block would run into the footer area. */
function ensureRoom(
  doc: PDFKit.PDFDocument,
  y: number,
  needed: number,
): number {
  if (y + needed <= doc.page.height - FOOTER_RESERVE) return y;
  doc.addPage();
  return doc.page.margins.top;
}

/** Helper — draws a gold section title with underline; returns the y of the first row under it */
function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number,
  color: string,
): number {
  // Keep the title together with at least its first row.
  y = ensureRoom(doc, y, 50);
  doc.fontSize(14).fill(color).text(title, 50, y);
  doc
    .moveTo(50, y + 18)
    .lineTo(250, y + 18)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke();
  return y + 28;
}

/** A value longer than this is cut so one field cannot run the document on for pages. */
const MAX_FIELD_CHARS = 2000;

/** Helper — draws a label: value row; returns the y of the next row */
function drawField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number,
  color: string,
): number {
  const shown =
    value.length > MAX_FIELD_CHARS
      ? `${value.slice(0, MAX_FIELD_CHARS)}…`
      : value;
  // Measure with the same line gap the text is drawn with, or a wrapped value
  // would run into the row below it.
  const lineHeight = Math.max(
    14,
    doc.fontSize(10).heightOfString(shown, { width: 370, lineGap: 2 }) + 2,
  );
  y = ensureRoom(doc, y, lineHeight);
  doc.fontSize(10).fill(color).text(`${label}:`, 50, y, { continued: false });
  doc
    .fontSize(10)
    .fill("#1a1a2e")
    .text(shown, 170, y, { width: 370, lineGap: 2 });
  return y + lineHeight;
}

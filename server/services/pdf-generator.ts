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
  submittedBy?: string; // username
  submittedAt?: string; // ISO date
}

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

    // ── Brand colours ──
    const gold = "#bf831c";
    const darkBg = "#1a1a2e";
    const grey = "#555555";

    // ── Header banner ──
    doc.rect(0, 0, doc.page.width, 100).fill(darkBg);
    doc
      .fontSize(28)
      .fill("#ffffff")
      .text("Verso Air", 50, 30, { align: "left" });
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

    // ── Status badge ──
    const badgeY = 120;
    doc.roundedRect(50, badgeY, 140, 28, 4).fill("#fff3cd");
    doc
      .fontSize(11)
      .fill("#856404")
      .text("⏳  PENDING APPROVAL", 58, badgeY + 7, { width: 130 });

    // ── Section: Business Details ──
    const sectionStart = badgeY + 55;
    drawSectionTitle(doc, "Business Details", sectionStart, gold);

    let y = sectionStart + 28;
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
    y += 10;
    drawSectionTitle(doc, "Location & Contact", y, gold);
    y += 28;
    y = drawField(doc, "Address", data.address || "—", y, grey);
    y = drawField(doc, "City", data.cityName || "—", y, grey);
    y = drawField(doc, "Country", data.countryCode || "—", y, grey);
    y = drawField(doc, "Phone", data.phone || "—", y, grey);
    y = drawField(doc, "Email", data.email || "—", y, grey);

    // ── Section: Submission Info ──
    y += 10;
    drawSectionTitle(doc, "Submission Information", y, gold);
    y += 28;
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

    // ── Approval section ──
    y += 20;
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

    // ── Footer ──
    const footerY = doc.page.height - 50;
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

/** Helper — draws a gold section title with underline */
function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number,
  color: string,
) {
  doc.fontSize(14).fill(color).text(title, 50, y);
  doc
    .moveTo(50, y + 18)
    .lineTo(250, y + 18)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke();
}

/** Helper — draws a label: value row */
function drawField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number,
  color: string,
): number {
  doc.fontSize(10).fill(color).text(`${label}:`, 50, y, { continued: false });
  doc
    .fontSize(10)
    .fill("#1a1a2e")
    .text(value, 170, y, { width: 370, lineGap: 2 });
  const lineHeight = Math.max(
    14,
    doc.heightOfString(value, { width: 370 }) + 4,
  );
  return y + lineHeight;
}

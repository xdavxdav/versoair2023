import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { pool } from "../db";

/**
 * Journal PDF Generator
 * Generates a branded multi-page A4 journal from active ad_journal_listings
 */

const JOURNAL_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "journal-editions")
    : path.resolve("uploads", "journal-editions");

try {
  if (!fs.existsSync(JOURNAL_DIR)) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`⚠️  Could not create journal dir (${JOURNAL_DIR}):`, err);
}

const gold = "#bf831c";
const darkBg = "#1a1a2e";
const grey = "#555555";

/**
 * Generate a complete journal edition PDF from active listings
 */
export async function generateJournalPDF(
  type: "weekly" | "monthly" | "on_demand" = "on_demand",
): Promise<{ filePath: string; listingCount: number }> {
  // Fetch active listings grouped by category
  const listingsResult = await pool.query(
    `SELECT * FROM ad_journal_listings 
     WHERE status = 'active' 
     ORDER BY type DESC, category, created_at DESC`,
  );
  const listings = listingsResult.rows;

  const fileName = `journal-${type}-${Date.now()}.pdf`;
  const filePath = path.join(JOURNAL_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Cover Page ──
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(darkBg);
    doc
      .fontSize(42)
      .fill("#ffffff")
      .text("Verso Air", 50, 200, { align: "center" });
    doc
      .fontSize(18)
      .fill(gold)
      .text("Journal d'Annonces", 50, 260, { align: "center" });

    const editionLabel =
      type === "weekly"
        ? "Édition Hebdomadaire"
        : type === "monthly"
          ? "Édition Mensuelle"
          : "Édition Spéciale";
    doc
      .fontSize(14)
      .fill("#aaaaaa")
      .text(editionLabel, 50, 300, { align: "center" });
    doc
      .fontSize(12)
      .fill("#888888")
      .text(
        new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        50,
        330,
        { align: "center" },
      );

    doc
      .fontSize(10)
      .fill("#666666")
      .text(
        `${listings.length} annonce${listings.length !== 1 ? "s" : ""} dans cette édition`,
        50,
        380,
        { align: "center" },
      );

    // ── Footer on cover ──
    doc
      .fontSize(8)
      .fill("#555555")
      .text(
        "Distribution gratuite • Supermarchés • Centres commerciaux • Lieux publics",
        50,
        doc.page.height - 60,
        { align: "center", width: doc.page.width - 100 },
      );

    // ── Listings Pages ──
    if (listings.length === 0) {
      doc.addPage();
      doc
        .fontSize(16)
        .fill(grey)
        .text("Aucune annonce active pour le moment.", 50, 100, {
          align: "center",
        });
      doc
        .fontSize(12)
        .fill("#888888")
        .text(
          "Publiez votre annonce sur verso-air.com/marketing/journal",
          50,
          140,
          { align: "center" },
        );
    } else {
      // Group by category
      const categories: Record<string, any[]> = {};
      for (const listing of listings) {
        const cat = listing.category || "Divers";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(listing);
      }

      for (const [category, catListings] of Object.entries(categories)) {
        doc.addPage();

        // Category header
        doc.rect(0, 0, doc.page.width, 60).fill(darkBg);
        doc
          .fontSize(20)
          .fill(gold)
          .text(category.toUpperCase(), 50, 18, { align: "left" });
        doc
          .fontSize(10)
          .fill("#aaaaaa")
          .text(
            `${catListings.length} annonce${catListings.length !== 1 ? "s" : ""}`,
            50,
            42,
            { align: "left" },
          );

        let y = 80;

        for (const listing of catListings) {
          // Check if we need a new page
          if (y > doc.page.height - 150) {
            doc.addPage();
            y = 50;
          }

          const isPremium = listing.type === "premium";

          // Listing card
          if (isPremium) {
            doc.rect(40, y - 5, doc.page.width - 80, 2).fill(gold);
          }

          doc.rect(40, y, doc.page.width - 80, 1).fill("#eeeeee");
          y += 8;

          // Title + badge
          doc
            .fontSize(13)
            .fill(darkBg)
            .text(listing.title || "Sans titre", 50, y, { width: 420 });
          if (isPremium) {
            doc
              .fontSize(8)
              .fill(gold)
              .text("★ PREMIUM", doc.page.width - 120, y);
          }
          y += 20;

          // Business name
          if (listing.business_name) {
            doc.fontSize(9).fill(gold).text(listing.business_name, 50, y);
            y += 14;
          }

          // Description (strip HTML tags for PDF)
          const plainDesc = (listing.description || "")
            .replace(/<[^>]*>/g, "")
            .substring(0, 200);
          if (plainDesc) {
            doc
              .fontSize(10)
              .fill(grey)
              .text(plainDesc, 50, y, { width: 450, lineGap: 2 });
            y += doc.heightOfString(plainDesc, { width: 450 }) + 6;
          }

          // Contact info
          const contactParts: string[] = [];
          if (listing.contact_phone)
            contactParts.push(`📞 ${listing.contact_phone}`);
          if (listing.contact_email)
            contactParts.push(`✉️ ${listing.contact_email}`);
          if (listing.location) contactParts.push(`📍 ${listing.location}`);

          if (contactParts.length > 0) {
            doc
              .fontSize(8)
              .fill("#888888")
              .text(contactParts.join("  •  "), 50, y);
            y += 14;
          }

          y += 15;
        }
      }
    }

    // ── Back cover ──
    doc.addPage();
    doc.rect(0, doc.page.height - 120, doc.page.width, 120).fill(darkBg);
    doc
      .fontSize(10)
      .fill("#ffffff")
      .text(
        "Verso Air™ — Plateforme Marketing Hybride",
        50,
        doc.page.height - 90,
        {
          align: "center",
          width: doc.page.width - 100,
        },
      );
    doc
      .fontSize(8)
      .fill(gold)
      .text(
        "verso-air.com/marketing • contact@verso-air.com",
        50,
        doc.page.height - 70,
        {
          align: "center",
          width: doc.page.width - 100,
        },
      );
    doc
      .fontSize(7)
      .fill("#666666")
      .text(
        `© ${new Date().getFullYear()} Verso Air — Tous droits réservés`,
        50,
        doc.page.height - 45,
        { align: "center", width: doc.page.width - 100 },
      );

    doc.end();

    stream.on("finish", () => {
      console.log(
        `[JOURNAL-PDF] Generated: ${filePath} (${listings.length} listings)`,
      );
      resolve({ filePath, listingCount: listings.length });
    });
    stream.on("error", (err) => {
      console.error("[JOURNAL-PDF] Error:", err);
      reject(err);
    });
  });
}

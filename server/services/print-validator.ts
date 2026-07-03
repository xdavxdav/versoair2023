/**
 * Print File Validation Service
 * Two-tier validation: Basic (always on) + Advanced (opt-in via sharp/pdf-parse)
 */

export interface ValidationCheck {
  name: string;
  status: "pass" | "warn" | "fail" | "skip";
  detail: string;
}

export interface ValidationReport {
  checks: ValidationCheck[];
  overallStatus: "pass" | "warn" | "fail";
}

// Allowed MIME types for print files
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/webp",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Basic validation — always runs (MIME type, file size, filename)
 */
export function basicValidation(file: Express.Multer.File): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // MIME type check
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    checks.push({
      name: "File type",
      status: "pass",
      detail: `Accepted format: ${file.mimetype}`,
    });
  } else {
    checks.push({
      name: "File type",
      status: "fail",
      detail: `Unsupported format: ${file.mimetype}. Accepted: PDF, PNG, JPG, TIFF`,
    });
  }

  // File size check
  if (file.size <= MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    checks.push({
      name: "File size",
      status: "pass",
      detail: `${sizeMB} MB (max 50 MB)`,
    });
  } else {
    checks.push({
      name: "File size",
      status: "fail",
      detail: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB (max 50 MB)`,
    });
  }

  // Filename sanitization check
  const hasSpecialChars = /[^a-zA-Z0-9._\-\s]/.test(file.originalname);
  if (hasSpecialChars) {
    checks.push({
      name: "Filename",
      status: "warn",
      detail: `Special characters in filename detected — file was renamed`,
    });
  } else {
    checks.push({
      name: "Filename",
      status: "pass",
      detail: `Clean filename: ${file.originalname}`,
    });
  }

  return checks;
}

/**
 * Advanced validation — opt-in, uses sharp (images) and pdf-parse (PDFs)
 * Falls back gracefully if sharp is unavailable (native module)
 */
export async function advancedValidation(
  filePath: string,
  mimetype: string,
  productSpecs?: {
    width_mm: number;
    height_mm: number;
    dpi_min: number;
    bleed_mm: number;
    color_space: string;
  },
): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];

  // --- Image validation with sharp ---
  if (mimetype.startsWith("image/")) {
    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(filePath).metadata();

      // DPI check
      const dpi = metadata.density || 0;
      const requiredDpi = productSpecs?.dpi_min || 300;
      if (dpi >= requiredDpi) {
        checks.push({
          name: "Resolution (DPI)",
          status: "pass",
          detail: `${dpi} DPI (required: ≥${requiredDpi})`,
        });
      } else if (dpi >= 150) {
        checks.push({
          name: "Resolution (DPI)",
          status: "warn",
          detail: `${dpi} DPI — acceptable but below recommended ${requiredDpi} DPI for optimal print quality`,
        });
      } else if (dpi > 0) {
        checks.push({
          name: "Resolution (DPI)",
          status: "fail",
          detail: `${dpi} DPI — too low for print (required: ≥${requiredDpi})`,
        });
      } else {
        checks.push({
          name: "Resolution (DPI)",
          status: "warn",
          detail: "DPI metadata not embedded — verify print quality manually",
        });
      }

      // Dimensions check (if product specs provided)
      if (productSpecs && metadata.width && metadata.height) {
        const widthMM = Math.round((metadata.width / (dpi || 300)) * 25.4);
        const heightMM = Math.round((metadata.height / (dpi || 300)) * 25.4);
        const expectedWidth = productSpecs.width_mm + productSpecs.bleed_mm * 2;
        const expectedHeight =
          productSpecs.height_mm + productSpecs.bleed_mm * 2;
        const tolerance = 5; // mm

        if (
          Math.abs(widthMM - expectedWidth) <= tolerance &&
          Math.abs(heightMM - expectedHeight) <= tolerance
        ) {
          checks.push({
            name: "Dimensions",
            status: "pass",
            detail: `${widthMM}×${heightMM}mm matches product spec (${expectedWidth}×${expectedHeight}mm incl. bleed)`,
          });
        } else {
          checks.push({
            name: "Dimensions",
            status: "warn",
            detail: `${widthMM}×${heightMM}mm — expected ~${expectedWidth}×${expectedHeight}mm (incl. ${productSpecs.bleed_mm}mm bleed)`,
          });
        }
      }

      // Color space check
      const space = metadata.space || "unknown";
      if (productSpecs?.color_space === "CMYK" && space !== "cmyk") {
        checks.push({
          name: "Color space",
          status: "warn",
          detail: `Image is ${space.toUpperCase()} — CMYK recommended for print. Colors may shift.`,
        });
      } else {
        checks.push({
          name: "Color space",
          status: "pass",
          detail: `${space.toUpperCase()} color space`,
        });
      }
    } catch (importErr) {
      // sharp not available — skip all advanced image checks
      checks.push({
        name: "Image analysis",
        status: "skip",
        detail: "Advanced image validation unavailable (sharp not installed)",
      });
    }
  }

  // --- PDF validation with pdf-parse ---
  if (mimetype === "application/pdf") {
    try {
      const fs = await import("fs");
      const pdfParseModule = (await import("pdf-parse")) as any;
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);

      checks.push({
        name: "PDF pages",
        status: "pass",
        detail: `${pdfData.numpages} page(s)`,
      });

      if (pdfData.info) {
        const producer = pdfData.info.Producer || "Unknown";
        checks.push({ name: "PDF producer", status: "pass", detail: producer });
      }

      // Check for text content (indicates it's not just an image)
      if (pdfData.text && pdfData.text.trim().length > 0) {
        checks.push({
          name: "PDF content",
          status: "pass",
          detail: "Contains text layers (vector-quality)",
        });
      } else {
        checks.push({
          name: "PDF content",
          status: "warn",
          detail:
            "No text layers — may be a rasterized image. Verify print quality.",
        });
      }
    } catch (pdfErr) {
      checks.push({
        name: "PDF analysis",
        status: "skip",
        detail: "PDF metadata extraction unavailable",
      });
    }
  }

  return checks;
}

/**
 * Run full validation pipeline
 */
export async function validatePrintFile(
  file: Express.Multer.File,
  filePath: string,
  advanced: boolean = false,
  productSpecs?: any,
): Promise<ValidationReport> {
  const checks: ValidationCheck[] = [];

  // Always run basic validation
  checks.push(...basicValidation(file));

  // Optionally run advanced validation
  if (advanced) {
    const advancedChecks = await advancedValidation(
      filePath,
      file.mimetype,
      productSpecs,
    );
    checks.push(...advancedChecks);
  }

  // Determine overall status
  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const overallStatus = hasFail ? "fail" : hasWarn ? "warn" : "pass";

  return { checks, overallStatus };
}

import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import path from "path";
import fs from "fs";

const VERSO_AIR_FOOTER = "Made with Verso Air — versoair.com";
const VERSO_AIR_BRAND_COLOR = "#2C1810"; // Verso Air dark brown
const VERSO_AIR_ACCENT = "#D4AF37"; // Verso Air gold accent

/**
 * Zod schema for validating AI-generated slide content
 */
const SlideSchema = z.object({
  title: z.string().max(100),
  content: z.string().max(500),
  bullets: z.array(z.string().max(150)).optional(),
});

const SlidesArraySchema = z.array(SlideSchema);

type Slide = z.infer<typeof SlideSchema>;

/**
 * Generate a deterministic PPTX presentation from an approved outline and AI-generated content
 * Enforces Verso Air footer on every slide and a branded closing slide
 */
export async function generatePresentation(
  topic: string,
  audience: string,
  language: string,
  slideCount: number,
  aiGeneratedContent: string,
  outputPath: string,
): Promise<{ filePath: string; fileSize: number }> {
  // Parse and validate AI-generated content as JSON array of slides
  let slides: Slide[];
  try {
    const parsed = JSON.parse(aiGeneratedContent);
    slides = SlidesArraySchema.parse(parsed);
  } catch (error) {
    throw new Error(`Invalid slide content format: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Ensure we have the expected slide count
  if (slides.length < 1) {
    throw new Error("AI generated fewer than 1 slide; presentation requires at least 1 slide");
  }

  // Create presentation
  const prs = new PptxGenJS();

  // Configure presentation
  prs.defineLayout({ name: "LAYOUT1", width: 10, height: 7.5 });
  prs.defineLayout({
    name: "BLANK",
    width: 10,
    height: 7.5,
  });

  // Set slide size (16:9)
  prs.defineLayout({
    name: "TITLE",
    width: 10,
    height: 7.5,
  });

  // Title slide
  const titleSlide = prs.addSlide("LAYOUT1");
  titleSlide.background = { color: VERSO_AIR_BRAND_COLOR };
  titleSlide.addText(topic, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1.5,
    fontSize: 48,
    bold: true,
    color: "FFFFFF",
    align: "center",
  });
  titleSlide.addText(audience || "Presentation", {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 1,
    fontSize: 24,
    color: "FFFFFF",
    align: "center",
  });
  addFooter(titleSlide);

  // Content slides
  for (const slide of slides) {
    const contentSlide = prs.addSlide("LAYOUT1");
    contentSlide.background = { color: "FFFFFF" };

    // Title
    contentSlide.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: VERSO_AIR_BRAND_COLOR,
    });

    // Content
    if (slide.bullets && slide.bullets.length > 0) {
      let bulletY = 1.3;
      for (const bullet of slide.bullets) {
        contentSlide.addText(`• ${bullet}`, {
          x: 0.8,
          y: bulletY,
          w: 8.4,
          h: 0.4,
          fontSize: 16,
          color: "000000",
        });
        bulletY += 0.5;
      }
    } else if (slide.content) {
      contentSlide.addText(slide.content, {
        x: 0.8,
        y: 1.3,
        w: 8.4,
        h: 5,
        fontSize: 14,
        color: "000000",
      });
    }

    addFooter(contentSlide);
  }

  // Closing branded slide
  const closingSlide = prs.addSlide("LAYOUT1");
  closingSlide.background = { color: VERSO_AIR_BRAND_COLOR }; // Dark brown background
  closingSlide.addText("Verso Air", {
    // White text on dark brown for excellent readability
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1,
    fontSize: 44,
    bold: true,
    color: "FFFFFF",
    align: "center",
  });
  closingSlide.addText("VersoAI Presentation Maker", {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 0.6,
    fontSize: 20,
    color: "FFFFFF",
    align: "center",
  });
  closingSlide.addText("versoair.com", {
    x: 0.5,
    y: 5,
    w: 9,
    h: 0.4,
    fontSize: 14,
    color: "FFFFFF",
    align: "center",
  });

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save presentation
  await prs.writeFile({ fileName: outputPath });

  // Get file size
  const fileSize = fs.statSync(outputPath).size;

  return { filePath: outputPath, fileSize };
}

/**
 * Add consistent footer to a slide
 */
function addFooter(slide: any): void {
  slide.addText(VERSO_AIR_FOOTER, {
    x: 0.5,
    y: 7,
    w: 9,
    h: 0.4,
    fontSize: 10,
    color: "666666",
    align: "center",
  });
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizePath(basePath: string, userFileName: string): string {
  const resolved = path.resolve(basePath, path.basename(userFileName));
  if (!resolved.startsWith(basePath)) {
    throw new Error("Invalid path: directory traversal attempt");
  }
  return resolved;
}

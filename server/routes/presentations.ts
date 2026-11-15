import { Router, Request, Response } from "express";
import { db } from "../db";
import { presentations, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  checkPresentationQuota,
  consumePresentationQuota,
  getClientIP,
} from "../services/presentation-quota";
import { generatePresentation } from "../services/pptx-builder";
import { requireVerifiedTier } from "../middleware/presentation-tier-gate";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Validation schemas
const DraftOutlineSchema = z.object({
  topic: z.string().min(3).max(200),
  audience: z.string().min(1).max(200),
  slideCount: z.number().int().min(3).max(50),
  language: z.enum(["en", "fr"]).default("en"),
});

const ApproveOutlineSchema = z.object({
  presentationId: z.string().uuid(),
  outline: z.string().min(10),
});

const GenerateContentSchema = z.object({
  presentationId: z.string().uuid(),
  aiContent: z.string(), // JSON array of slides from AI
});

/**
 * POST /api/presentation/draft
 * Create a draft presentation with outline from AI
 */
router.post(
  "/draft",
  requireAuth,
  requireVerifiedTier,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const clientIP = getClientIP(req);

      // Validate input
      const validated = DraftOutlineSchema.parse(req.body);

      // Check quota
      const quotaCheck = await checkPresentationQuota(user.id, clientIP);
      if (!quotaCheck.allowed) {
        res.status(429).json({
          error: "Quota exceeded",
          message: "You have reached your daily presentation generation limit",
          resetAt: quotaCheck.resetAt,
        });
        return;
      }

      // Create draft presentation
      const presentation = await db
        .insert(presentations)
        .values({
          userId: user.id,
          title: validated.topic,
          topic: validated.topic,
          audience: validated.audience,
          slideCount: validated.slideCount,
          language: validated.language,
          status: "draft",
          outline: `Topic: ${validated.topic}\nAudience: ${validated.audience}\nSlide Count: ${validated.slideCount}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!presentation[0]) {
        throw new Error("Failed to create presentation");
      }

      res.status(201).json({
        id: presentation[0].id,
        topic: presentation[0].topic,
        audience: presentation[0].audience,
        slideCount: presentation[0].slideCount,
        language: presentation[0].language,
        outline: presentation[0].outline,
        status: presentation[0].status,
        createdAt: presentation[0].createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        console.error("Draft outline error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  },
);

/**
 * POST /api/presentation/approve
 * Approve an outline for content generation
 */
router.post(
  "/approve",
  requireAuth,
  requireVerifiedTier,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const validated = ApproveOutlineSchema.parse(req.body);

      // Verify ownership
      const presentation = await db
        .select()
        .from(presentations)
        .where(eq(presentations.id, validated.presentationId))
        .limit(1);

      if (!presentation[0] || presentation[0].userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Update presentation with approved outline
      const updated = await db
        .update(presentations)
        .set({
          outline: validated.outline,
          outlineApprovedAt: new Date(),
          status: "outline_approved",
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, validated.presentationId))
        .returning();

      res.json({
        id: updated[0].id,
        status: updated[0].status,
        outlineApprovedAt: updated[0].outlineApprovedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        console.error("Approve outline error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  },
);

/**
 * POST /api/presentation/generate
 * Generate PPTX content from an approved outline
 * Requires approved outline before generation
 */
router.post(
  "/generate",
  requireAuth,
  requireVerifiedTier,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const clientIP = getClientIP(req);
      const validated = GenerateContentSchema.parse(req.body);

      // Verify ownership and outline approval
      const presentation = await db
        .select()
        .from(presentations)
        .where(eq(presentations.id, validated.presentationId))
        .limit(1);

      if (!presentation[0] || presentation[0].userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (!presentation[0].outlineApprovedAt) {
        res.status(400).json({
          error: "Outline not approved",
          message: "Outline must be approved before generation",
        });
        return;
      }

      // Check quota again before actual generation
      const quotaCheck = await checkPresentationQuota(user.id, clientIP);
      if (!quotaCheck.allowed) {
        res.status(429).json({
          error: "Quota exceeded",
          message: "You have reached your daily presentation generation limit",
          resetAt: quotaCheck.resetAt,
        });
        return;
      }

      // Generate PPTX
/**
 * WARNING: File Storage
 * Currently using /tmp directory, which is not guaranteed to persist across deployments.
 * For production, configure one of:
 * 1. AWS S3 (with cloudfront CDN for downloads)
 * 2. Google Cloud Storage
 * 3. Persistent file system mount (EBS volume on AWS, persistent disk on GCP)
 * 4. Azure Blob Storage
 * Set PPTX_STORAGE_TYPE env var to: "s3" | "gcs" | "local" | "azure"
 * Each requires corresponding SDK and configuration in environment variables.
 */
      const tmpDir = path.join(os.tmpdir(), "verso-presentations");
      const fileName = `${presentation[0].id}.pptx`;
      const outputPath = sanitizePath(tmpDir, fileName);

      const result = await generatePresentation(
        presentation[0].topic,
        presentation[0].audience || "",
        presentation[0].language || "en",
        presentation[0].slideCount || 10,
        validated.aiContent,
        outputPath,
      );

      // Update presentation with PPTX info
      const updated = await db
        .update(presentations)
        .set({
          pptxUrl: `/api/presentation/${presentation[0].id}/download`,
          fileSize: result.fileSize,
          status: "generated",
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, validated.presentationId))
        .returning();

      // Consume quota
      await consumePresentationQuota(user.id, clientIP);

      res.json({
        id: updated[0].id,
        status: updated[0].status,
        pptxUrl: updated[0].pptxUrl,
        fileSize: updated[0].fileSize,
        message: "Presentation generated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        console.error("Generate error:", error);
        res.status(500).json({
          error: "Generation failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  },
);

/**
 * GET /api/presentation/:id/download
 * Download a generated PPTX file (owner-only)
 */
router.get(
  "/:id/download",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      // Verify ownership
      const presentation = await db
        .select()
        .from(presentations)
        .where(eq(presentations.id, id))
        .limit(1);

      if (!presentation[0] || presentation[0].userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (presentation[0].status !== "generated" && !presentation[0].pptxUrl) {
        res.status(404).json({ error: "Presentation file not found" });
        return;
      }

      // Construct file path
      const tmpDir = path.join(os.tmpdir(), "verso-presentations");
      const filePath = path.join(tmpDir, `${id}.pptx`);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "File not found on server" });
        return;
      }

      res.download(filePath, `${presentation[0].title}.pptx`);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  },
);

/**
 * GET /api/presentations
 * List user's presentations (owner-scoped)
 */
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      const userPresentations = await db
        .select()
        .from(presentations)
        .where(eq(presentations.userId, user.id));

      res.json(userPresentations);
    } catch (error) {
      console.error("List error:", error);
      res.status(500).json({ error: "Failed to list presentations" });
    }
  },
);

/**
 * DELETE /api/presentation/:id
 * Delete a presentation (owner-only)
 */
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      // Verify ownership
      const presentation = await db
        .select()
        .from(presentations)
        .where(eq(presentations.id, id))
        .limit(1);

      if (!presentation[0] || presentation[0].userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Delete database record (blob is automatically deleted by cascade)
      await db
        .delete(presentations)
        .where(eq(presentations.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Delete failed" });
    }
  },
);

export default router;

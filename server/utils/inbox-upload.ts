import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export const INBOX_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

class UnsupportedAttachmentTypeError extends Error {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: INBOX_ATTACHMENT_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new UnsupportedAttachmentTypeError("Unsupported attachment type"));
  },
});

/**
 * Accepts one image in the `file` field. A rejected file is the sender's
 * mistake, so it is reported as a 4xx instead of reaching the 500 handler.
 */
export function receiveInboxAttachment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  upload.single("file")(req, res, (error?: unknown) => {
    if (!error) return next();

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(413)
        .json({ success: false, error: "That image is larger than 8 MB." });
    }
    if (error instanceof UnsupportedAttachmentTypeError) {
      return res.status(415).json({
        success: false,
        error: "Only JPEG, PNG, WebP or GIF images can be attached.",
      });
    }
    if (error instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ success: false, error: "The attachment could not be read." });
    }
    return next(error);
  });
}

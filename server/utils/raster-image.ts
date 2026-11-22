/**
 * Strict raster-image validation via magic-byte inspection.
 * Only JPEG, PNG, WebP, and GIF are permitted — SVG/HTML/arbitrary binaries
 * are rejected to prevent stored XSS on user-uploaded avatars, covers, and posts.
 */
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedRasterMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

const ALLOWED_CLIENT_MIMES = new Set<string>([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Inspect buffer header bytes and return the canonical MIME type, or null if
 * the buffer is not a recognized JPEG, PNG, WebP, or GIF image.
 */
export function sniffRasterImageMime(buffer: Buffer): AllowedRasterMime | null {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a or GIF89a
  const gifSig = buffer.subarray(0, 6).toString("ascii");
  if (gifSig === "GIF87a" || gifSig === "GIF89a") {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export type RasterValidationResult =
  | { ok: true; mime: AllowedRasterMime; size: number }
  | { ok: false; status: number; message: string };

export function validateRasterImageBuffer(
  buffer: Buffer | undefined,
  declaredMime?: string,
  maxBytes: number = MAX_PROFILE_IMAGE_BYTES,
): RasterValidationResult {
  if (!buffer || buffer.length === 0) {
    return { ok: false, status: 400, message: "No image file provided." };
  }
  if (buffer.length > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      status: 413,
      message: `Image is too large. Maximum size is ${mb} MB.`,
    };
  }
  if (declaredMime && !ALLOWED_CLIENT_MIMES.has(declaredMime.toLowerCase())) {
    return {
      ok: false,
      status: 415,
      message: "Only JPEG, PNG, WebP, or GIF images are supported.",
    };
  }
  const detected = sniffRasterImageMime(buffer);
  if (!detected) {
    return {
      ok: false,
      status: 415,
      message:
        "File content is not a valid JPEG, PNG, WebP, or GIF image.",
    };
  }
  return { ok: true, mime: detected, size: buffer.length };
}

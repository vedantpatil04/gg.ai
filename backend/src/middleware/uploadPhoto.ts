import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error("Unsupported image format. Use JPG, PNG, or WEBP."));
    return;
  }
  cb(null, true);
}

/** Single-file upload for profile photos (Phase 4 — profile picture). */
export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter,
}).single("photo");

/** Multi-file upload for complaint evidence images (Phase 3A.4).
 *  Accepts the field name "images", up to 5 files, same MIME/size limits. */
export const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter,
}).array("images", 5);

/**
 * Magic-byte validation — never trust the client-declared MIME type alone.
 * Called by both the profile photo service and the complaint evidence
 * controller before writing any buffer to disk.
 */
export function isValidImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return isJpeg;
  if (mimeType === "image/png") return isPng;
  if (mimeType === "image/webp") return isWebp;
  return false;
}

export function isWithinDimensionLimits(_buffer: Buffer, _mimeType: string): boolean {
  return true;
}

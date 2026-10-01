/**
 * The upload pipeline for item photos. Every photo goes through here before
 * it's stored, on the server, whatever the browser did first.
 *
 * 1. Check it's really an image (by decoding it, not by trusting the file name).
 * 2. Rotate it upright using its EXIF orientation, then re-encode it as a new
 *    JPEG. Re-encoding with sharp copies NO metadata unless asked to, so EXIF,
 *    GPS location, camera serial numbers, XMP, and IPTC are all dropped.
 * 3. Shrink it to at most 1600px on the long side (plenty for a phone screen).
 *
 * Face blur (SPEC spike T0.4) is meant to run in the browser BEFORE upload, so
 * an unblurred face never leaves the device. It isn't built yet; see the TODO
 * in src/components/photo-input.tsx. Nothing here pretends to blur faces.
 */
import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 1600;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "heif", "gif", "tiff"]);

export type ImageError = "too_big" | "not_image";

export async function processUpload(input: Uint8Array): Promise<{ ok: true; jpeg: Buffer } | { ok: false; error: ImageError }> {
  if (input.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "too_big" };
  try {
    // limitInputPixels guards against "decompression bombs" (a tiny file that
    // decodes to an enormous image).
    const image = sharp(input, { failOn: "error", limitInputPixels: 50_000_000 });
    const meta = await image.metadata();
    if (!meta.format || !ACCEPTED.has(meta.format)) return { ok: false, error: "not_image" };
    const jpeg = await image
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { ok: true, jpeg };
  } catch {
    return { ok: false, error: "not_image" };
  }
}

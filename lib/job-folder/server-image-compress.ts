import sharp from "sharp";
import { MAX_COMPRESSED_IMAGE_BYTES } from "@/lib/job-folder/file-validation";
import type { AllowedUploadType } from "@/lib/job-folder/file-validation";

export async function compressImageBuffer(
  buffer: Buffer,
  sourceType: Extract<AllowedUploadType, "image/jpeg" | "image/png">
): Promise<Buffer> {
  let quality = 85;
  let width = 1600;

  let result = await sharp(buffer, { failOn: "error" })
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (result.length > MAX_COMPRESSED_IMAGE_BYTES && quality > 40) {
    quality -= 10;
    result = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  while (result.length > MAX_COMPRESSED_IMAGE_BYTES && width > 800) {
    width -= 200;
    result = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: Math.max(quality, 50), mozjpeg: true })
      .toBuffer();
  }

  if (result.length > MAX_COMPRESSED_IMAGE_BYTES) {
    throw new Error("compress_failed");
  }

  return result;
}

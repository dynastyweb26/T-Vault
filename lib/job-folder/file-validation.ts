export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_COMPRESSED_IMAGE_BYTES = 1 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

const SUSPICIOUS_FILENAME =
  /[<>:"/\\|?*\x00-\x1f]|\.(exe|bat|cmd|sh|js|mjs|cjs|html|htm|php|svg|zip|dmg|app)$/i;

export function isSuspiciousFilename(filename: string): boolean {
  const trimmed = filename.trim();
  if (!trimmed || trimmed.length > 255) return true;
  if (trimmed.includes("..")) return true;
  return SUSPICIOUS_FILENAME.test(trimmed);
}

export function detectFileTypeFromBuffer(
  buffer: Uint8Array
): AllowedUploadType | null {
  if (buffer.length < 4) return null;

  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
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

  return null;
}

export function extensionForUploadType(
  type: AllowedUploadType,
  compressedImage = false
): "jpg" | "png" | "pdf" {
  if (type === "application/pdf") return "pdf";
  if (compressedImage || type === "image/jpeg") return "jpg";
  return "png";
}

export function buildServerStoragePath(
  userId: string,
  jobId: string,
  documentType: string,
  extension: "jpg" | "png" | "pdf"
): string {
  const safeDocType = documentType.replace(/[^a-z0-9_]/gi, "") || "document";
  return `${userId}/${jobId}/${safeDocType}_${Date.now()}.${extension}`;
}

export function buildInvoiceStoragePath(
  userId: string,
  invoiceNumber: string
): string {
  const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "") || "invoice";
  return `${userId}/invoices/${safeNumber}.pdf`;
}

export function buildServerDisplayName(
  documentType: string,
  extension: "jpg" | "png" | "pdf"
): string {
  const safeDocType = documentType.replace(/[^a-z0-9_]/gi, "") || "document";
  return `${safeDocType}_${Date.now()}.${extension}`;
}

export function validateUploadBuffer(
  buffer: Uint8Array,
  originalFilename?: string | null
):
  | { ok: true; contentType: AllowedUploadType }
  | { ok: false } {
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false };
  }

  if (originalFilename && isSuspiciousFilename(originalFilename)) {
    return { ok: false };
  }

  const contentType = detectFileTypeFromBuffer(buffer);
  if (!contentType) {
    return { ok: false };
  }

  return { ok: true, contentType };
}

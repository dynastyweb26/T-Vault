const PRODUCTION_APP_URL = "https://t-vault-psi.vercel.app";

/**
 * Public site origin for links embedded in PDFs and emails.
 * Prefer NEXT_PUBLIC_APP_URL; fall back to Vercel preview URL, then production.
 */
export function getPublicAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return PRODUCTION_APP_URL;
}

export function buildInvoiceVerificationUrl(invoiceNumber: string): string {
  const safeNumber = invoiceNumber.trim();
  return `${getPublicAppUrl()}/invoice/${encodeURIComponent(safeNumber)}`;
}

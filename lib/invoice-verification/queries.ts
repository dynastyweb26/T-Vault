import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import { toCityState, computeInvoiceTotal } from "@/lib/invoice-verification/format";

export interface InvoiceVerificationData {
  invoiceNumber: string;
  generatedDate: string;
  companyName: string;
  mcNumber: string | null;
  dotNumber: string | null;
  routeLabel: string;
  totalAmount: string;
}

const JOB_VERIFY_SELECT =
  "invoice_number, invoice_sent_date, updated_at, invoice_generated, invoice_url, pickup_location, delivery_location, load_value, fuel_surcharge, accessorial_charges, user_id";

const PROFILE_VERIFY_SELECT = "company_name, mc_number, dot_number";

function normalizeInvoiceNumber(raw: string): string | null {
  const decoded = decodeURIComponent(raw.trim());
  if (!decoded || decoded.length > 80) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(decoded)) return null;
  return decoded;
}

function formatVerificationDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function fetchInvoiceVerification(
  rawInvoiceNumber: string
): Promise<InvoiceVerificationData | null> {
  const invoiceNumber = normalizeInvoiceNumber(rawInvoiceNumber);
  if (!invoiceNumber) return null;

  const admin = createAdminClient();

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select(JOB_VERIFY_SELECT)
    .eq("invoice_number", invoiceNumber)
    .is("deleted_at", null)
    .maybeSingle();

  if (jobError || !job) return null;

  if (
    !job.invoice_generated &&
    !job.invoice_url &&
    !job.invoice_number
  ) {
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select(PROFILE_VERIFY_SELECT)
    .eq("id", job.user_id)
    .maybeSingle();

  if (profileError || !profile) return null;

  const pickup = toCityState(job.pickup_location);
  const delivery = toCityState(job.delivery_location);
  const generatedDate = formatVerificationDate(
    job.invoice_sent_date || job.updated_at
  );

  return {
    invoiceNumber: job.invoice_number ?? invoiceNumber,
    generatedDate,
    companyName: profile.company_name?.trim() || "Carrier",
    mcNumber: profile.mc_number?.trim() || null,
    dotNumber: profile.dot_number?.trim() || null,
    routeLabel: `${pickup} → ${delivery}`,
    totalAmount: formatCurrencyDetailed(computeInvoiceTotal(job)),
  };
}

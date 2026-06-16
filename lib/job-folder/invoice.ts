import { jsPDF } from "jspdf";
import type { Job } from "@/types/jobs";
import type { UserProfile } from "@/types/database";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import { saveDocumentFromBlob } from "@/lib/job-folder/upload";
import type { SupabaseClient } from "@supabase/supabase-js";

export function buildInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function generateAndSaveLoadInvoice(
  supabase: SupabaseClient,
  params: {
    job: Job;
    profile: UserProfile | null;
    userId: string;
  }
): Promise<{ url: string; invoiceNumber: string }> {
  const { job, profile, userId } = params;
  const invoiceNumber =
    job.invoice_number || buildInvoiceNumber(profile?.invoice_count ?? 0);

  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("T-Vault Invoice", 20, 24);
  doc.setFontSize(11);
  doc.text(`Invoice #: ${invoiceNumber}`, 20, 36);
  doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, 20, 44);
  doc.text("Bill To", 20, 60);
  doc.text(job.broker_name || "Broker", 20, 68);
  doc.text("From", 120, 60);
  doc.text(profile?.company_name || profile?.full_name || "Carrier", 120, 68);
  if (profile?.mc_number) doc.text(profile.mc_number, 120, 76);
  doc.text("Load Details", 20, 96);
  doc.text(`Job: ${job.job_name}`, 20, 104);
  doc.text(
    `Route: ${job.pickup_location || "Pickup"} → ${job.delivery_location || "Delivery"}`,
    20,
    112
  );
  doc.text(`Amount: ${formatCurrencyDetailed(job.load_value ?? 0)}`, 20, 120);
  doc.setFontSize(10);
  doc.text("Designed by Dynasty Web", 20, 280);

  const blob = doc.output("blob");
  const url = await saveDocumentFromBlob(supabase, {
    userId,
    jobId: job.id,
    documentType: "invoice",
    blob,
    fileName: `${invoiceNumber}.pdf`,
  });

  await supabase
    .from("jobs")
    .update({
      invoice_generated: true,
      invoice_number: invoiceNumber,
      invoice_sent_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  await supabase
    .from("users")
    .update({ invoice_count: (profile?.invoice_count ?? 0) + 1 })
    .eq("id", userId);

  return { url, invoiceNumber };
}

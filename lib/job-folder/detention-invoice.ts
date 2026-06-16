import { jsPDF } from "jspdf";
import type { Job } from "@/types/jobs";
import type { UserProfile } from "@/types/database";
import { formatDuration } from "@/lib/job-folder/detention";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";

export async function generateDetentionInvoicePdf(params: {
  job: Job;
  profile: UserProfile | null;
  totalMinutes: number;
  billableMinutes: number;
  hourlyRate: number;
  amountOwed: number;
  rateConNumber?: string | null;
}): Promise<Blob> {
  const { job, profile, totalMinutes, billableMinutes, hourlyRate, amountOwed, rateConNumber } =
    params;

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(201, 168, 76);
  doc.text("DETENTION INVOICE", 20, 24);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(profile?.company_name || profile?.full_name || "Carrier", 20, 36);
  if (profile?.mc_number) doc.text(profile.mc_number, 20, 44);
  if (profile?.dot_number) doc.text(profile.dot_number, 20, 52);

  doc.text(`Job: ${job.job_name}`, 20, 68);
  doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, 20, 76);
  doc.text(`Broker: ${job.broker_name || "Broker"}`, 20, 84);
  doc.text(`Duration: ${formatDuration(totalMinutes)}`, 20, 96);
  doc.text(`Billable time: ${billableMinutes} minutes above free 2 hours`, 20, 104);
  doc.text(`Rate: ${formatCurrencyDetailed(hourlyRate)}/hour`, 20, 112);
  doc.text(`Amount Due: ${formatCurrencyDetailed(amountOwed)}`, 20, 124);
  if (rateConNumber) {
    doc.text(`Reference: Rate Confirmation #${rateConNumber}`, 20, 136);
  }
  doc.setFontSize(10);
  doc.text(
    "Detention time begins after 2 free hours per industry standard",
    20,
    150
  );
  doc.text("Designed by Dynasty Web", 20, 280);

  return doc.output("blob");
}

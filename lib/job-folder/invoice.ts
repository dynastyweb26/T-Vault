import { jsPDF } from "jspdf";
import type { Job } from "@/types/jobs";
import type { UserProfile } from "@/types/database";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import { saveInvoiceDocument } from "@/lib/job-folder/upload";
import { hasPendingAiForInvoice } from "@/lib/job-folder/ai-parsing";
import type { JobDocument } from "@/types/jobs";
import type { SupabaseClient } from "@supabase/supabase-js";

const GOLD = { r: 212, g: 160, b: 23 } as const;
const GOLD_TINT = { r: 255, g: 248, b: 230 } as const;
const GREY = { r: 120, g: 120, b: 120 } as const;
const LIGHT_GREY = { r: 245, g: 245, b: 245 } as const;
const BLACK = { r: 0, g: 0, b: 0 } as const;
const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT_X = PAGE_W - MARGIN;

export function buildInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

function setTextColor(
  doc: jsPDF,
  color: { r: number; g: number; b: number }
): void {
  doc.setTextColor(color.r, color.g, color.b);
}

function textRight(doc: jsPDF, text: string, x: number, y: number): void {
  doc.text(text, x - doc.getTextWidth(text), y);
}

function drawGoldLine(doc: jsPDF, y: number): void {
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, RIGHT_X, y);
}

function formatInvoiceDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function paymentTermsDays(job: Job): number {
  return job.payment_type === "factoring" ? 2 : 30;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function paymentInstructions(job: Job, profile: UserProfile | null): string {
  if (job.payment_type === "factoring" && job.factoring_company) {
    return `Remit payment to ${job.factoring_company} per your factoring agreement.`;
  }
  if (profile?.company_name) {
    return `Please remit payment to ${profile.company_name} by check, ACH, or wire per agreed terms.`;
  }
  return "Please remit payment by check, ACH, or wire per agreed terms.";
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones ? `${TENS[tens]}-${ONES[ones].toLowerCase()}` : TENS[tens];
  }
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const hundredPart = `${ONES[hundreds]} Hundred`;
  return remainder ? `${hundredPart} ${chunkToWords(remainder)}` : hundredPart;
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const scales = [
    { value: 1_000_000_000, label: "Billion" },
    { value: 1_000_000, label: "Million" },
    { value: 1_000, label: "Thousand" },
  ];

  let remaining = n;
  for (const scale of scales) {
    const count = Math.floor(remaining / scale.value);
    if (count > 0) {
      parts.push(`${chunkToWords(count)} ${scale.label}`);
      remaining %= scale.value;
    }
  }

  if (remaining > 0) {
    parts.push(chunkToWords(remaining));
  }

  return parts.join(" ");
}

function amountInWords(amount: number): string {
  const safe = Math.max(0, amount);
  const dollars = Math.floor(safe);
  const cents = Math.round((safe - dollars) * 100);
  return `${integerToWords(dollars)} Dollars and ${String(cents).padStart(2, "0")}/100`;
}

function drawSectionLabel(doc: jsPDF, label: string, x: number, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, GOLD);
  doc.text(label.toUpperCase(), x, y);
  return y + 5;
}

function drawDetailLine(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, GREY);
  doc.text(`${label}:`, x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(doc, BLACK);
  doc.text(value, x + 28, y);
  return y + 6;
}

function drawWrappedLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  startY: number,
  lineHeight = 5
): number {
  let y = startY;
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function buildLoadInvoicePdf(params: {
  job: Job;
  profile: UserProfile | null;
  invoiceNumber: string;
  invoiceDate?: Date;
}): jsPDF {
  const { job, profile, invoiceNumber } = params;
  const invoiceDate = params.invoiceDate ?? new Date();
  const dueDate = addDays(invoiceDate, paymentTermsDays(job));
  const amount = job.load_value ?? 0;
  const termsDays = paymentTermsDays(job);
  const amountText = formatCurrencyDetailed(amount);
  const words = amountInWords(amount);

  const route = `${job.pickup_location?.trim() || "Pickup"} → ${job.delivery_location?.trim() || "Delivery"}`;
  const dateRange = `${formatShortDate(job.pickup_date)} → ${formatShortDate(job.delivery_date)}`;
  const milesText =
    job.miles && job.miles > 0
      ? `${job.miles.toLocaleString("en-US")} miles`
      : "—";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setTextColor(doc, GOLD);
  doc.text("T-VAULT", MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, GREY);
  doc.text("FREIGHT INVOICE", MARGIN, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setTextColor(doc, BLACK);
  textRight(doc, invoiceNumber, RIGHT_X, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(doc, GREY);
  textRight(doc, `Date: ${formatInvoiceDate(invoiceDate)}`, RIGHT_X, y + 7);
  textRight(doc, `Due Date: ${formatInvoiceDate(dueDate)}`, RIGHT_X, y + 13);

  y += 22;
  drawGoldLine(doc, y);
  y += 10;

  const columnGap = 8;
  const columnW = (CONTENT_W - columnGap) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + columnW + columnGap;

  let leftY = drawSectionLabel(doc, "From", leftX, y);
  const fromLines: string[] = [];

  if (profile?.full_name?.trim()) fromLines.push(profile.full_name.trim());
  if (profile?.company_name?.trim()) fromLines.push(profile.company_name.trim());
  if (profile?.mc_number?.trim()) fromLines.push(`MC# ${profile.mc_number.trim()}`);
  if (profile?.dot_number?.trim()) fromLines.push(`DOT# ${profile.dot_number.trim()}`);
  if (profile?.phone?.trim()) fromLines.push(profile.phone.trim());
  if (fromLines.length === 0) fromLines.push("Carrier");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTextColor(doc, BLACK);
  doc.text(fromLines[0], leftX, leftY);
  leftY += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of fromLines.slice(1)) {
    doc.text(line, leftX, leftY);
    leftY += 5;
  }

  leftY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, GREY);
  doc.text("PAYMENT INSTRUCTIONS", leftX, leftY);
  leftY += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, BLACK);
  const instructionLines = doc.splitTextToSize(
    paymentInstructions(job, profile),
    columnW
  );
  leftY = drawWrappedLines(doc, instructionLines, leftX, leftY, 4.5);

  let rightY = drawSectionLabel(doc, "Bill To", rightX, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTextColor(doc, BLACK);
  doc.text(job.broker_name?.trim() || "Broker", rightX, rightY);
  rightY += 6;

  if (job.payment_type === "factoring" && job.factoring_company?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTextColor(doc, GREY);
    doc.text("Factoring Company", rightX, rightY);
    rightY += 4.5;
    setTextColor(doc, BLACK);
    const factoringLines = doc.splitTextToSize(job.factoring_company.trim(), columnW);
    rightY = drawWrappedLines(doc, factoringLines, rightX, rightY);
  }

  y = Math.max(leftY, rightY) + 8;

  const loadPadding = 6;
  const loadInnerW = CONTENT_W - loadPadding * 2;
  const jobNameLines = doc.splitTextToSize(
    job.job_name?.trim() || "Load",
    loadInnerW
  );
  const loadBoxH =
    loadPadding * 2 + jobNameLines.length * 7 + 4 + 6 * 3;

  doc.setFillColor(LIGHT_GREY.r, LIGHT_GREY.g, LIGHT_GREY.b);
  doc.rect(MARGIN, y, CONTENT_W, loadBoxH, "F");

  let loadY = y + loadPadding + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setTextColor(doc, BLACK);
  loadY = drawWrappedLines(doc, jobNameLines, MARGIN + loadPadding, loadY, 7);
  loadY += 1;
  loadY = drawDetailLine(doc, "Route", route, MARGIN + loadPadding, loadY);
  loadY = drawDetailLine(doc, "Dates", dateRange, MARGIN + loadPadding, loadY);
  drawDetailLine(doc, "Miles", milesText, MARGIN + loadPadding, loadY);

  y += loadBoxH + 10;

  const amountPadding = 8;
  const amountInnerW = CONTENT_W - amountPadding * 2;
  const wordLines = doc.splitTextToSize(words, amountInnerW);
  const amountBoxH =
    amountPadding * 2 + 4 + 10 + 10 + wordLines.length * 5 + 2 + 5;

  doc.setFillColor(GOLD_TINT.r, GOLD_TINT.g, GOLD_TINT.b);
  doc.rect(MARGIN, y, CONTENT_W, amountBoxH, "F");

  let amountY = y + amountPadding + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, GOLD);
  doc.text("AMOUNT DUE", MARGIN + amountPadding, amountY);
  amountY += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setTextColor(doc, BLACK);
  doc.text(amountText, MARGIN + amountPadding, amountY);
  amountY += 10;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  setTextColor(doc, GREY);
  amountY = drawWrappedLines(
    doc,
    wordLines,
    MARGIN + amountPadding,
    amountY,
    5
  );

  amountY += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, GREY);
  doc.text(
    `Payment due within ${termsDays} days`,
    MARGIN + amountPadding,
    amountY
  );

  const footerY = 268;
  drawGoldLine(doc, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(doc, BLACK);
  const thanks = "Thank you for your business.";
  doc.text(thanks, PAGE_W / 2 - doc.getTextWidth(thanks) / 2, footerY + 10);

  doc.setFontSize(8);
  setTextColor(doc, GREY);
  textRight(doc, "Designed by Dynasty Web", RIGHT_X, footerY + 18);

  return doc;
}

export async function generateAndSaveLoadInvoice(
  supabase: SupabaseClient,
  params: {
    job: Job;
    profile: UserProfile | null;
    userId: string;
    documents?: JobDocument[];
    regenerate?: boolean;
  }
): Promise<{ url: string; invoiceNumber: string }> {
  const { job, profile, userId, documents = [], regenerate = false } = params;

  if (hasPendingAiForInvoice(job, documents)) {
    throw new Error("ai_review_required");
  }

  const hasExistingInvoice = Boolean(
    job.invoice_number || job.invoice_generated || job.invoice_url
  );

  if (regenerate && !hasExistingInvoice) {
    throw new Error("no_invoice_to_regenerate");
  }

  const invoiceNumber =
    job.invoice_number || buildInvoiceNumber(profile?.invoice_count ?? 0);

  const doc = buildLoadInvoicePdf({ job, profile, invoiceNumber });
  const blob = doc.output("blob");
  const url = await saveInvoiceDocument(supabase, {
    userId,
    jobId: job.id,
    invoiceNumber,
    blob,
  });

  await supabase
    .from("jobs")
    .update({
      invoice_generated: true,
      invoice_number: invoiceNumber,
      invoice_url: url,
      invoice_sent_date:
        regenerate && job.invoice_sent_date
          ? job.invoice_sent_date
          : new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("user_id", userId);

  if (!regenerate && !hasExistingInvoice) {
    await supabase
      .from("users")
      .update({ invoice_count: (profile?.invoice_count ?? 0) + 1 })
      .eq("id", userId);
  }

  return { url, invoiceNumber };
}

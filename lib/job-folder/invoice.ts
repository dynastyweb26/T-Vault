import type { jsPDF } from "jspdf";
import type { Job } from "@/types/jobs";
import type { UserProfile } from "@/types/database";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import { saveInvoiceDocument } from "@/lib/job-folder/upload";
import { hasPendingAiForInvoice } from "@/lib/job-folder/ai-parsing";
import { STORAGE_BUCKET } from "@/lib/job-folder/constants";
import type { JobDocument } from "@/types/jobs";
import type { SupabaseClient } from "@supabase/supabase-js";

const GOLD = { r: 184, g: 150, b: 12 } as const;
const DARK = { r: 26, g: 26, b: 26 } as const;
const MID_GREY = { r: 74, g: 74, b: 74 } as const;
const LIGHT_GREY = { r: 120, g: 120, b: 120 } as const;
const BORDER_GREY = { r: 224, g: 224, b: 224 } as const;
const ROW_ALT = { r: 252, g: 252, b: 252 } as const;
const AMOUNT_BG = { r: 253, g: 249, b: 231 } as const;
const AMOUNT_BORDER = { r: 230, g: 211, b: 133 } as const;
const FACTOR_BG = { r: 239, g: 246, b: 255 } as const;
const FACTOR_BORDER = { r: 191, g: 219, b: 254 } as const;
const NOTES_BG = { r: 250, g: 250, b: 250 } as const;
const FOOTER_GREY = { r: 153, g: 153, b: 153 } as const;
const WHITE = { r: 255, g: 255, b: 255 } as const;

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT_X = PAGE_W - MARGIN;

type Rgb = { r: number; g: number; b: number };

interface PaymentInfoFields {
  bankName?: string;
  accountName?: string;
  routingNo?: string;
  accountNo?: string;
}

export function getMissingInvoiceFields(
  job: Job,
  profile: UserProfile | null
): string[] {
  const missing: string[] = [];
  if (!profile?.company_name?.trim()) missing.push("company name");
  if (!profile?.mc_number?.trim()) missing.push("MC number");
  if (!profile?.dot_number?.trim()) missing.push("DOT number");
  if (!job.broker_name?.trim()) missing.push("broker name");
  if (job.load_value == null || job.load_value <= 0) missing.push("load value");
  return missing;
}

export function formatMissingInvoiceFieldsMessage(missing: string[]): string {
  if (missing.length === 0) return "";
  if (missing.length === 1) {
    return `Add ${missing[0]} before generating an invoice.`;
  }
  return `Add ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]} before generating an invoice.`;
}

export function buildInvoiceNumber(userId: string, count: number): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const userPrefix = userId.replace(/-/g, "").slice(0, 4).toLowerCase();
  return `INV-${ymd}-${userPrefix}-${String(count + 1).padStart(4, "0")}`;
}

function setTextColor(doc: jsPDF, color: Rgb): void {
  doc.setTextColor(color.r, color.g, color.b);
}

function setDrawColor(doc: jsPDF, color: Rgb): void {
  doc.setDrawColor(color.r, color.g, color.b);
}

function setFillColor(doc: jsPDF, color: Rgb): void {
  doc.setFillColor(color.r, color.g, color.b);
}

function textRight(doc: jsPDF, text: string, x: number, y: number): void {
  doc.text(text, x - doc.getTextWidth(text), y);
}

function formatSlashDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatShortSlashDate(value: string | null | undefined): string {
  if (!value) return "ΓÇö";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildInvoicePublicUrl(userId: string, invoiceNumber: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "") || "invoice";
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${userId}/invoices/${safeNumber}.pdf`;
}

function parsePaymentInfo(raw: string | null | undefined): PaymentInfoFields | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PaymentInfoFields;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // fall through to line parsing
  }
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const fields: PaymentInfoFields = {};
  for (const line of lines) {
    const [label, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (!value) continue;
    const key = label.trim().toLowerCase();
    if (key.includes("bank")) fields.bankName = value;
    else if (key.includes("account name")) fields.accountName = value;
    else if (key.includes("routing")) fields.routingNo = value;
    else if (key.includes("account no") || key.includes("account #")) {
      fields.accountNo = value;
    }
  }
  return Object.keys(fields).length ? fields : null;
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

function invoiceTotal(job: Job): number {
  return (
    (job.load_value ?? 0) +
    (job.fuel_surcharge && job.fuel_surcharge > 0 ? job.fuel_surcharge : 0) +
    (job.accessorial_charges && job.accessorial_charges > 0
      ? job.accessorial_charges
      : 0)
  );
}

function drawSectionHeader(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  width: number
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, DARK);
  doc.text(label.toUpperCase(), x, y);
  setDrawColor(doc, GOLD);
  doc.setLineWidth(0.5);
  doc.line(x, y + 2, x + width, y + 2);
  return y + 10;
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 11
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawOptionalLine(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize = 9
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  setTextColor(doc, MID_GREY);
  doc.text(text, x, y);
  return y + 11;
}

function drawCarrierColumn(
  doc: jsPDF,
  profile: UserProfile | null,
  userEmail: string | null,
  job: Job,
  x: number,
  startY: number,
  width: number
): number {
  let y = drawSectionHeader(doc, "FROM (CARRIER)", x, startY, width);

  if (profile?.company_name?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, GOLD);
    y = drawWrapped(doc, profile.company_name.trim(), x, y, width, 14);
    y += 2;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);

  const addressLines: string[] = [];
  if (profile?.address?.trim()) addressLines.push(profile.address.trim());
  const cityStateZip = [profile?.city, profile?.state, profile?.zip]
    .filter((part) => part?.trim())
    .join(", ")
    .replace(/,\s*,/g, ",");
  if (cityStateZip.trim()) addressLines.push(cityStateZip.trim());

  for (const line of addressLines) {
    y = drawWrapped(doc, line, x, y, width, 11);
  }

  const contactParts: string[] = [];
  if (profile?.phone?.trim()) contactParts.push(profile.phone.trim());
  if (userEmail?.trim()) contactParts.push(userEmail.trim());
  if (contactParts.length) {
    y = drawWrapped(doc, contactParts.join(" | "), x, y, width, 11);
  }

  const authorityParts: string[] = [];
  if (profile?.mc_number?.trim()) {
    authorityParts.push(`MC #: ${profile.mc_number.trim()}`);
  }
  if (profile?.dot_number?.trim()) {
    authorityParts.push(`DOT #: ${profile.dot_number.trim()}`);
  }
  if (authorityParts.length) {
    y = drawWrapped(doc, authorityParts.join(" | "), x, y, width, 11);
  }

  if (profile?.ein?.trim()) {
    y = drawOptionalLine(doc, `EIN: ${profile.ein.trim()}`, x, y);
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, DARK);
  doc.text("REMIT PAYMENT TO", x, y);
  y += 10;

  const paymentInfo = parsePaymentInfo(profile?.payment_info);
  const remitLines: Array<[string, string | undefined]> = [
    ["Bank Name:", paymentInfo?.bankName],
    ["Account Name:", paymentInfo?.accountName],
    ["Routing No:", paymentInfo?.routingNo],
    ["Account No:", paymentInfo?.accountNo],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  for (const [label, value] of remitLines) {
    if (!value?.trim()) continue;
    doc.text(`${label} ${value.trim()}`, x, y);
    y += 11;
  }

  if (job.payment_type === "factoring" && job.factoring_company?.trim()) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    setTextColor(doc, LIGHT_GREY);
    const note = `* Payment assigned to ${job.factoring_company.trim()}. Direct all remittance to factoring company.`;
    y = drawWrapped(doc, note, x, y + 2, width, 10);
  }

  return y;
}

function drawBillToColumn(
  doc: jsPDF,
  job: Job,
  x: number,
  startY: number,
  width: number
): number {
  let y = drawSectionHeader(doc, "TO (BROKER / FACTORING CO)", x, startY, width);
  const isFactoring = job.payment_type === "factoring";

  const primaryName = isFactoring
    ? job.factoring_company?.trim()
    : job.broker_name?.trim();

  if (primaryName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, GOLD);
    y = drawWrapped(doc, primaryName, x, y, width, 14);
    y += 2;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  y = drawOptionalLine(doc, "Attention: Accounts Payable", x, y);

  if (isFactoring && job.broker_name?.trim()) {
    doc.setFontSize(9);
    setTextColor(doc, MID_GREY);
    y = drawWrapped(
      doc,
      `Original Broker: ${job.broker_name.trim()}`,
      x,
      y,
      width,
      11
    );
  }

  return y;
}

function drawLoadTable(
  doc: jsPDF,
  job: Job,
  startY: number
): number {
  const colWidths = [
    CONTENT_W * 0.25,
    CONTENT_W * 0.2,
    CONTENT_W * 0.2,
    CONTENT_W * 0.13,
    CONTENT_W * 0.08,
    CONTENT_W * 0.14,
  ];
  const colX = [MARGIN];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colX.push(colX[i] + colWidths[i]);
  }

  const headerH = 18;
  setFillColor(doc, DARK);
  doc.rect(MARGIN, startY, CONTENT_W, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, WHITE);
  const headers = ["Description", "Pickup", "Delivery", "Dates", "Load", "Amount"];
  headers.forEach((header, index) => {
    doc.text(header.toUpperCase(), colX[index] + 4, startY + 12);
  });

  let y = startY + headerH;
  const rows: Array<{
    description: string;
    descriptionSub?: string;
    pickup: string;
    pickupSub?: string;
    delivery: string;
    deliverySub?: string;
    dates: string[];
    load: string;
    amount: string;
  }> = [
    {
      description: "Primary Freight Charge",
      descriptionSub: job.commodity?.trim()
        ? `Commodity: ${job.commodity.trim()}`
        : undefined,
      pickup: job.pickup_location?.trim() || "ΓÇö",
      pickupSub: job.pickup_facility?.trim() || undefined,
      delivery: job.delivery_location?.trim() || "ΓÇö",
      deliverySub: job.delivery_facility?.trim() || undefined,
      dates: [
        `P: ${formatShortSlashDate(job.pickup_date)}`,
        `D: ${formatShortSlashDate(job.delivery_date)}`,
      ],
      load: job.miles ? String(job.miles) : "ΓÇö",
      amount: formatCurrencyDetailed(job.load_value ?? 0),
    },
  ];

  if (job.fuel_surcharge != null && job.fuel_surcharge > 0) {
    rows.push({
      description: "Fuel Surcharge (FSC)",
      pickup: "--",
      delivery: "--",
      dates: ["--"],
      load: "--",
      amount: formatCurrencyDetailed(job.fuel_surcharge),
    });
  }

  if (job.accessorial_charges != null && job.accessorial_charges > 0) {
    rows.push({
      description: "Detention",
      descriptionSub: "e.g. Detention / Layover / Tarping",
      pickup: "--",
      delivery: "--",
      dates: ["--"],
      load: "--",
      amount: formatCurrencyDetailed(job.accessorial_charges),
    });
  }

  rows.forEach((row, rowIndex) => {
    const rowTop = y;
    const rowH = 42;
    if (rowIndex % 2 === 1) {
      setFillColor(doc, ROW_ALT);
      doc.rect(MARGIN, rowTop, CONTENT_W, rowH, "F");
    }
    setDrawColor(doc, BORDER_GREY);
    doc.setLineWidth(0.75);
    doc.rect(MARGIN, rowTop, CONTENT_W, rowH);

    let cellY = rowTop + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, DARK);
    doc.text(row.description, colX[0] + 4, cellY);
    if (row.descriptionSub) {
      doc.setFontSize(8.5);
      setTextColor(doc, LIGHT_GREY);
      doc.text(row.descriptionSub, colX[0] + 4, cellY + 10);
    }

    doc.setFontSize(9);
    setTextColor(doc, DARK);
    doc.text(row.pickup, colX[1] + 4, cellY);
    if (row.pickupSub) {
      doc.setFontSize(8.5);
      setTextColor(doc, LIGHT_GREY);
      doc.text(row.pickupSub, colX[1] + 4, cellY + 10);
    }

    doc.setFontSize(9);
    setTextColor(doc, DARK);
    doc.text(row.delivery, colX[2] + 4, cellY);
    if (row.deliverySub) {
      doc.setFontSize(8.5);
      setTextColor(doc, LIGHT_GREY);
      doc.text(row.deliverySub, colX[2] + 4, cellY + 10);
    }

    row.dates.forEach((line, index) => {
      doc.setFontSize(9);
      setTextColor(doc, DARK);
      doc.text(line, colX[3] + 4, cellY + index * 10);
    });

    doc.text(row.load, colX[4] + 4, cellY);
    doc.text(row.amount, colX[5] + 4, cellY);

    y += rowH;
  });

  return y + 8;
}

function drawAmountDueBox(doc: jsPDF, total: number, startY: number): number {
  const boxH = 88;
  setFillColor(doc, AMOUNT_BG);
  setDrawColor(doc, AMOUNT_BORDER);
  doc.setLineWidth(1);
  doc.rect(MARGIN, startY, CONTENT_W, boxH, "FD");
  setFillColor(doc, GOLD);
  doc.rect(MARGIN, startY, 5, boxH, "F");

  const centerX = PAGE_W / 2;
  let y = startY + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, { r: 85, g: 85, b: 85 });
  const label = "TOTAL AMOUNT DUE";
  doc.text(label, centerX - doc.getTextWidth(label) / 2, y);

  y += 24;
  doc.setFontSize(24);
  setTextColor(doc, GOLD);
  const amountText = formatCurrencyDetailed(total);
  doc.text(amountText, centerX - doc.getTextWidth(amountText) / 2, y);

  y += 20;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  setTextColor(doc, { r: 85, g: 85, b: 85 });
  const dollars = Math.floor(Math.max(0, total));
  const words = `*** ${integerToWords(dollars).toUpperCase()} DOLLARS AND ZERO CENTS ***`;
  const wordLines = doc.splitTextToSize(words, CONTENT_W - 40);
  for (const line of wordLines) {
    doc.text(line, centerX - doc.getTextWidth(line) / 2, y);
    y += 11;
  }

  return startY + boxH + 12;
}

function drawFactoringNotice(doc: jsPDF, job: Job, startY: number): number {
  const body = `This invoice has been assigned to ${job.factoring_company?.trim()}. All payments must be remitted directly to the factoring company. Do not pay the carrier directly.`;
  const lines = doc.splitTextToSize(body, CONTENT_W - 24);
  const boxH = 24 + lines.length * 11;
  setFillColor(doc, FACTOR_BG);
  setDrawColor(doc, FACTOR_BORDER);
  doc.setLineWidth(1);
  doc.rect(MARGIN, startY, CONTENT_W, boxH, "FD");

  let y = startY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, DARK);
  doc.text("NOTICE OF INVOICE ASSIGNMENT", MARGIN + 12, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  for (const line of lines) {
    doc.text(line, MARGIN + 12, y);
    y += 11;
  }
  return startY + boxH + 12;
}

function drawNotesSection(
  doc: jsPDF,
  job: Job,
  profile: UserProfile | null,
  startY: number
): number {
  const contentLines: string[] = [];
  if (job.notes?.trim()) contentLines.push(job.notes.trim());
  contentLines.push(
    "1. Please include Invoice Number and Load/Reference Number on all check remittances or ACH payment advices.",
    "2. Signed BOL and Rate Confirmation are attached to this submission.",
    profile?.phone?.trim()
      ? `3. For quick-pay or factoring verification contact: ${profile.phone.trim()}`
      : "3. For quick-pay or factoring verification contact."
  );

  const content = contentLines.join("\n");
  const bodyLines = doc.splitTextToSize(content, CONTENT_W - 24);
  const boxH = 28 + bodyLines.length * 11;
  setFillColor(doc, NOTES_BG);
  setDrawColor(doc, BORDER_GREY);
  doc.setLineWidth(1);
  doc.rect(MARGIN, startY, CONTENT_W, boxH, "FD");

  let y = startY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, DARK);
  doc.text("NOTES & INSTRUCTIONS", MARGIN + 10, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  for (const line of bodyLines) {
    doc.text(line, MARGIN + 10, y);
    y += 11;
  }

  return startY + boxH + 12;
}

function drawFooter(doc: jsPDF, qrDataUrl: string | null, footerY: number): void {
  setDrawColor(doc, BORDER_GREY);
  doc.setLineWidth(1);
  doc.line(MARGIN, footerY, RIGHT_X, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setTextColor(doc, DARK);
  doc.text("Thank you for your business.", MARGIN, footerY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, FOOTER_GREY);
  textRight(doc, "Designed by Dynasty Web", RIGHT_X, footerY + 16);

  if (qrDataUrl) {
    const qrSize = 64;
    const qrX = RIGHT_X - qrSize;
    const qrY = footerY - qrSize - 18;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    setTextColor(doc, LIGHT_GREY);
    const qrLabel = "Scan to verify invoice";
    textRight(doc, qrLabel, RIGHT_X, qrY + qrSize + 10);
  }
}

export async function buildLoadInvoicePdf(params: {
  job: Job;
  profile: UserProfile | null;
  invoiceNumber: string;
  userId: string;
  userEmail?: string | null;
  invoiceDate?: Date;
}): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const QRCode = (await import("qrcode")).default;

  const { job, profile, invoiceNumber, userId, userEmail } = params;
  const invoiceDate = params.invoiceDate ?? new Date();
  const dueDate = addDays(invoiceDate, 30);
  const total = invoiceTotal(job);
  const columnGap = 16;
  const columnW = (CONTENT_W - columnGap) / 2;

  const doc = new JsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setTextColor(doc, DARK);
  doc.text("INVOICE", MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(doc, GOLD);
  const subtitle = "T-VAULT OWNER-OPERATOR NETWORK";
  let subtitleX = MARGIN;
  for (const char of subtitle) {
    doc.text(char, subtitleX, y + 16);
    subtitleX += doc.getTextWidth(char) + 1.2;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(doc, MID_GREY);
  const headerLines: string[] = [
    `Invoice No: ${invoiceNumber}`,
    `Date: ${formatSlashDate(invoiceDate)}`,
    "Payment Terms: NET 30",
    `Due Date: ${formatSlashDate(dueDate)}`,
    `Load / Reference No: ${job.id}`,
  ];
  if (job.rate_con_number?.trim()) {
    headerLines.push(`Rate Con #: ${job.rate_con_number.trim()}`);
  }
  if (job.bol_number?.trim()) {
    headerLines.push(`BOL #: ${job.bol_number.trim()}`);
  }
  headerLines.forEach((line, index) => {
    textRight(doc, line, RIGHT_X, y + index * 12);
  });

  y += 52;
  setDrawColor(doc, GOLD);
  doc.setLineWidth(3);
  doc.line(MARGIN, y, RIGHT_X, y);
  y += 18;

  const leftY = drawCarrierColumn(
    doc,
    profile,
    userEmail ?? profile?.email ?? null,
    job,
    MARGIN,
    y,
    columnW
  );
  const rightY = drawBillToColumn(
    doc,
    job,
    MARGIN + columnW + columnGap,
    y,
    columnW
  );
  y = Math.max(leftY, rightY) + 10;

  setDrawColor(doc, GOLD);
  doc.setLineWidth(2);
  doc.line(MARGIN, y, RIGHT_X, y);
  y += 14;

  y = drawLoadTable(doc, job, y);
  y = drawAmountDueBox(doc, total, y);

  if (job.payment_type === "factoring" && job.factoring_company?.trim()) {
    y = drawFactoringNotice(doc, job, y);
  }

  y = drawNotesSection(doc, job, profile, y);

  const publicUrl = buildInvoicePublicUrl(userId, invoiceNumber);
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 128,
      margin: 0,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });
  } catch {
    qrDataUrl = null;
  }

  const footerY = PAGE_H - MARGIN - 24;
  drawFooter(doc, qrDataUrl, footerY);

  return doc;
}

export async function generateAndSaveLoadInvoice(
  supabase: SupabaseClient,
  params: {
    job: Job;
    profile: UserProfile | null;
    userId: string;
    userEmail?: string | null;
    documents?: JobDocument[];
    regenerate?: boolean;
  }
): Promise<{ url: string; invoiceNumber: string }> {
  const {
    job,
    profile,
    userId,
    userEmail,
    documents = [],
    regenerate = false,
  } = params;

  const missingFields = getMissingInvoiceFields(job, profile);
  if (missingFields.length > 0) {
    throw new Error(`missing_invoice_fields:${missingFields.join(",")}`);
  }

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
    job.invoice_number || buildInvoiceNumber(userId, profile?.invoice_count ?? 0);

  const doc = await buildLoadInvoicePdf({
    job,
    profile,
    invoiceNumber,
    userId,
    userEmail,
  });
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

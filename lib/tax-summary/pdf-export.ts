import type { jsPDF } from "jspdf";
import type { UserProfile } from "@/types/database";
import type { TaxSummaryData } from "@/lib/tax-summary/calculations";
import { getTaxSummaryExpenseLabel } from "@/lib/tax-summary/category-labels";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/dashboard/format";

const GOLD = { r: 184, g: 150, b: 12 } as const;
const DARK = { r: 26, g: 26, b: 26 } as const;
const MID_GREY = { r: 74, g: 74, b: 74 } as const;
const LIGHT_GREY = { r: 120, g: 120, b: 120 } as const;
const BORDER_GREY = { r: 224, g: 224, b: 224 } as const;
const ROW_ALT = { r: 252, g: 252, b: 252 } as const;
const AMOUNT_BG = { r: 253, g: 249, b: 231 } as const;
const AMOUNT_BORDER = { r: 230, g: 211, b: 133 } as const;
const FOOTER_GREY = { r: 153, g: 153, b: 153 } as const;
const WHITE = { r: 255, g: 255, b: 255 } as const;
const LABEL_GREY = { r: 85, g: 85, b: 85 } as const;

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT_X = PAGE_W - MARGIN;
const FOOTER_Y = PAGE_H - MARGIN - 8;
const FOOTER_RESERVE = 36;
const CONTENT_MAX_Y = FOOTER_Y - FOOTER_RESERVE;

const RECORDKEEPING_BADGE =
  "RECORDKEEPING SUMMARY — NOT A TAX FILING DOCUMENT";
const DISCLAIMER =
  "Prepared from user-entered data for recordkeeping purposes only. This is not tax advice. Consult a qualified tax professional before filing.";
const TAX_PRO_LINE =
  "Contact a licensed tax professional to review these numbers before filing.";

type Rgb = { r: number; g: number; b: number };

export interface TaxSummaryPdfOptions {
  data: TaxSummaryData;
  profile: UserProfile | null;
  receiptsOnFile: number;
  invoicesGenerated: number;
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

function maskEin(ein: string | null | undefined): string | null {
  if (!ein?.trim()) return null;
  const digits = ein.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••-••-${digits.slice(-4)}`;
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
  return y + 12;
}

function drawSpacedCaps(doc: jsPDF, text: string, x: number, y: number): void {
  let cursorX = x;
  for (const char of text) {
    doc.text(char, cursorX, y);
    cursorX += doc.getTextWidth(char) + (char === " " ? 2.4 : 0.8);
  }
}

function drawRecordkeepingBadge(
  doc: jsPDF,
  x: number,
  y: number,
  condensed: boolean
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(condensed ? 7 : 8);
  const badgeText = RECORDKEEPING_BADGE;
  const textWidth = badgeText
    .split("")
    .reduce(
      (sum, char) =>
        sum + doc.getTextWidth(char) + (char === " " ? 2.4 : 0.8),
      -0.8
    );
  const padX = condensed ? 8 : 10;
  const badgeH = condensed ? 14 : 18;
  const badgeW = textWidth + padX * 2;

  setFillColor(doc, AMOUNT_BG);
  setDrawColor(doc, GOLD);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y - badgeH + 4, badgeW, badgeH, 3, 3, "FD");
  setTextColor(doc, GOLD);
  drawSpacedCaps(doc, badgeText, x + padX, y - (condensed ? 2 : 3));

  return y + (condensed ? 8 : 10);
}

function drawDocumentHeader(
  doc: jsPDF,
  rangeLabel: string,
  generatedDate: string,
  condensed: boolean
): number {
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(condensed ? 14 : 24);
  setTextColor(doc, DARK);
  doc.text("Tax Summary Report", MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(condensed ? 9 : 10);
  setTextColor(doc, MID_GREY);
  textRight(doc, rangeLabel, RIGHT_X, y);
  textRight(doc, `Generated ${generatedDate}`, RIGHT_X, y + (condensed ? 10 : 12));

  y += condensed ? 20 : 30;
  y = drawRecordkeepingBadge(doc, MARGIN, y, condensed);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(condensed ? 8 : 9);
  setTextColor(doc, MID_GREY);
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, CONTENT_W);
  for (const line of disclaimerLines) {
    doc.text(line, MARGIN, y);
    y += condensed ? 10 : 11;
  }

  y += condensed ? 6 : 8;
  setDrawColor(doc, GOLD);
  doc.setLineWidth(3);
  doc.line(MARGIN, y, RIGHT_X, y);

  return y + 16;
}

function estimateIncomeSectionHeight(data: TaxSummaryData): number {
  if (data.monthlyIncome.length === 0) return 60;
  return 46 + 18 + data.monthlyIncome.length * 18 + 12;
}

function estimateExpenseSectionHeight(data: TaxSummaryData): number {
  const rowCount = data.expenseBreakdown.filter((item) =>
    Boolean(getTaxSummaryExpenseLabel(item.category))
  ).length;
  if (rowCount === 0) return 40;
  return 30 + 18 + rowCount * 20 + 18;
}

function estimateCostPerMileSectionHeight(): number {
  return 76;
}

function estimateSupportingDocsHeight(): number {
  return 70;
}

interface PdfLayoutContext {
  doc: jsPDF;
  y: number;
  pageCount: number;
  rangeLabel: string;
  generatedDate: string;
}

function startNewPage(ctx: PdfLayoutContext, condensed: boolean): void {
  if (ctx.pageCount > 0) {
    ctx.doc.addPage();
  }
  ctx.y = drawDocumentHeader(
    ctx.doc,
    ctx.rangeLabel,
    ctx.generatedDate,
    condensed
  );
  ctx.pageCount += 1;
}

function ensureSpace(
  ctx: PdfLayoutContext,
  neededHeight: number,
  condensed: boolean
): void {
  if (ctx.y + neededHeight > CONTENT_MAX_Y) {
    startNewPage(ctx, condensed);
  }
}

function finalizeFooters(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }
}

function drawFooter(doc: jsPDF, page: number, totalPages: number): void {
  setDrawColor(doc, BORDER_GREY);
  doc.setLineWidth(1);
  doc.line(MARGIN, FOOTER_Y - 12, RIGHT_X, FOOTER_Y - 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  doc.text("Generated by T-Vault — A Dynasty Web Product", MARGIN, FOOTER_Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, FOOTER_GREY);
  textRight(doc, `Page ${page} of ${totalPages}`, RIGHT_X, FOOTER_Y);
}

function drawBusinessInfo(
  doc: jsPDF,
  profile: UserProfile | null,
  startY: number
): number {
  let y = drawSectionHeader(
    doc,
    "Business Information",
    MARGIN,
    startY,
    CONTENT_W
  );

  const businessName =
    profile?.company_name?.trim() || profile?.full_name?.trim() || "Carrier";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setTextColor(doc, GOLD);
  doc.text(businessName, MARGIN, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);

  const maskedEin = maskEin(profile?.ein);
  if (maskedEin) {
    doc.text(`EIN: ${maskedEin}`, MARGIN, y);
    y += 12;
  }

  const authorityParts: string[] = [];
  if (profile?.mc_number?.trim()) {
    authorityParts.push(`MC #: ${profile.mc_number.trim()}`);
  }
  if (profile?.dot_number?.trim()) {
    authorityParts.push(`DOT #: ${profile.dot_number.trim()}`);
  }
  if (authorityParts.length) {
    doc.text(authorityParts.join(" | "), MARGIN, y);
    y += 12;
  }

  return y + 8;
}

function drawIncomeSection(doc: jsPDF, data: TaxSummaryData, startY: number): number {
  let y = drawSectionHeader(doc, "Income Summary", MARGIN, startY, CONTENT_W);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTextColor(doc, DARK);
  doc.text("Gross Revenue", MARGIN, y);
  doc.setFontSize(16);
  setTextColor(doc, GOLD);
  doc.text(formatCurrency(data.totalEarned), MARGIN, y + 18);
  y += 34;

  if (data.monthlyIncome.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, LIGHT_GREY);
    doc.text("No monthly income recorded for this period.", MARGIN, y);
    return y + 14;
  }

  const colMonthW = CONTENT_W * 0.62;
  const colAmountW = CONTENT_W * 0.38;
  const headerH = 18;

  setFillColor(doc, DARK);
  doc.rect(MARGIN, y, CONTENT_W, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, WHITE);
  doc.text("MONTH", MARGIN + 6, y + 12);
  textRight(doc, "AMOUNT", MARGIN + colMonthW + colAmountW - 6, y + 12);
  y += headerH;

  data.monthlyIncome.forEach((row, index) => {
    const rowH = 18;
    if (index % 2 === 1) {
      setFillColor(doc, ROW_ALT);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }
    setDrawColor(doc, BORDER_GREY);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN, y, CONTENT_W, rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, DARK);
    doc.text(row.label, MARGIN + 6, y + 12);
    textRight(
      doc,
      formatCurrency(row.amount),
      MARGIN + colMonthW + colAmountW - 6,
      y + 12
    );
    y += rowH;
  });

  return y + 12;
}

function drawExpenseTable(doc: jsPDF, data: TaxSummaryData, startY: number): number {
  let y = drawSectionHeader(doc, "Expense Summary", MARGIN, startY, CONTENT_W);

  const expenseRows = data.expenseBreakdown
    .map((item) => ({
      label: getTaxSummaryExpenseLabel(item.category),
      amount: item.amount,
    }))
    .filter((item): item is { label: string; amount: number } => Boolean(item.label));

  if (expenseRows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, LIGHT_GREY);
    doc.text("No expenses recorded for this period.", MARGIN, y);
    return y + 14;
  }

  const colCategoryW = CONTENT_W * 0.62;
  const colAmountW = CONTENT_W * 0.38;
  const headerH = 18;

  setFillColor(doc, DARK);
  doc.rect(MARGIN, y, CONTENT_W, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, WHITE);
  doc.text("CATEGORY", MARGIN + 6, y + 12);
  textRight(doc, "AMOUNT", MARGIN + colCategoryW + colAmountW - 6, y + 12);
  y += headerH;

  expenseRows.forEach((row, index) => {
    const rowH = 20;
    if (index % 2 === 1) {
      setFillColor(doc, ROW_ALT);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }
    setDrawColor(doc, BORDER_GREY);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN, y, CONTENT_W, rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, DARK);
    const labelLines = doc.splitTextToSize(row.label, colCategoryW - 12);
    doc.text(labelLines[0], MARGIN + 6, y + 12);
    textRight(
      doc,
      formatCurrency(row.amount),
      MARGIN + colCategoryW + colAmountW - 6,
      y + 12
    );
    y += rowH;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  textRight(
    doc,
    `Total Expenses: ${formatCurrency(data.totalExpenses)}`,
    RIGHT_X,
    y + 4
  );

  return y + 18;
}

function drawNetProfitBox(doc: jsPDF, data: TaxSummaryData, startY: number): number {
  const boxH = 92;
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
  setTextColor(doc, LABEL_GREY);
  const label = "ESTIMATED NET PROFIT";
  doc.text(label, centerX - doc.getTextWidth(label) / 2, y);

  y += 24;
  doc.setFontSize(24);
  setTextColor(doc, GOLD);
  const amountText = formatCurrency(data.netIncome);
  doc.text(amountText, centerX - doc.getTextWidth(amountText) / 2, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setTextColor(doc, LABEL_GREY);
  const note =
    "Gross Income - Total Expenses. This is an estimate based on recorded data, not a final tax calculation.";
  const noteLines = doc.splitTextToSize(note, CONTENT_W - 36);
  for (const line of noteLines) {
    doc.text(line, centerX - doc.getTextWidth(line) / 2, y);
    y += 10;
  }

  return startY + boxH + 10;
}

function drawTaxProfessionalLine(doc: jsPDF, startY: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setTextColor(doc, DARK);
  doc.text(TAX_PRO_LINE, MARGIN, startY);
  return startY + 16;
}

function drawSupportingDocs(
  doc: jsPDF,
  receiptsOnFile: number,
  invoicesGenerated: number,
  startY: number
): number {
  let y = drawSectionHeader(
    doc,
    "Supporting Documentation",
    MARGIN,
    startY,
    CONTENT_W
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, DARK);
  doc.text(`${receiptsOnFile.toLocaleString()} receipts on file`, MARGIN, y);
  y += 12;
  doc.text(
    `${invoicesGenerated.toLocaleString()} invoices generated`,
    MARGIN,
    y
  );
  y += 14;

  doc.setFontSize(8.5);
  setTextColor(doc, MID_GREY);
  doc.text(
    "This report is supported by the records listed above, stored in your T-Vault account.",
    MARGIN,
    y
  );

  return y + 12;
}

function drawCostPerMileSection(doc: jsPDF, data: TaxSummaryData, startY: number): number {
  let y = drawSectionHeader(doc, "Cost Per Mile", MARGIN, startY, CONTENT_W);

  const rows = [
    ["Revenue / Mile", formatCurrencyDetailed(data.costPerMile.revenuePerMile)],
    ["Cost / Mile", formatCurrencyDetailed(data.costPerMile.costPerMile)],
    ["Net / Mile", formatCurrencyDetailed(data.costPerMile.netPerMile)],
    ["Total Miles", data.costPerMile.totalMiles.toLocaleString()],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTextColor(doc, DARK);
    doc.text(label, MARGIN, y);
    textRight(doc, value, RIGHT_X, y);
    y += 16;
  });

  return y;
}

function drawJobSummaryRows(
  doc: jsPDF,
  rows: TaxSummaryData["jobSummary"],
  startY: number,
  includeSectionHeader: boolean
): { endY: number; rowsDrawn: number } {
  let y = includeSectionHeader
    ? drawSectionHeader(doc, "Load by Load Summary", MARGIN, startY, CONTENT_W)
    : startY;

  let rowsDrawn = 0;
  for (const row of rows) {
    if (y + 16 > CONTENT_MAX_Y) break;

    if (rowsDrawn % 2 === 1) {
      setFillColor(doc, ROW_ALT);
      doc.rect(MARGIN, y, CONTENT_W, 16, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, DARK);
    doc.text(
      `${row.jobName} | ${row.completionDate || "—"} | Rev ${formatCurrency(row.revenue)} | Exp ${formatCurrency(row.expenses)} | Net ${formatCurrency(row.net)}`,
      MARGIN,
      y + 11
    );
    y += 16;
    rowsDrawn += 1;
  }

  return { endY: y, rowsDrawn };
}

export async function generateTaxSummaryPdf(
  options: TaxSummaryPdfOptions
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { data, profile, receiptsOnFile, invoicesGenerated } = options;
  const generatedDate = formatSlashDate(new Date());

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const ctx: PdfLayoutContext = {
    doc,
    y: 0,
    pageCount: 0,
    rangeLabel: data.range.label,
    generatedDate,
  };

  startNewPage(ctx, false);
  ctx.y = drawBusinessInfo(doc, profile, ctx.y);

  ensureSpace(ctx, estimateIncomeSectionHeight(data), ctx.pageCount > 0);
  ctx.y = drawIncomeSection(doc, data, ctx.y);

  ensureSpace(ctx, estimateExpenseSectionHeight(data), ctx.pageCount > 0);
  ctx.y = drawExpenseTable(doc, data, ctx.y);

  ensureSpace(ctx, 102, ctx.pageCount > 0);
  ctx.y = drawNetProfitBox(doc, data, ctx.y);

  ensureSpace(ctx, 24, ctx.pageCount > 0);
  ctx.y = drawTaxProfessionalLine(doc, ctx.y + 8);

  ensureSpace(ctx, estimateSupportingDocsHeight(), ctx.pageCount > 0);
  ctx.y = drawSupportingDocs(doc, receiptsOnFile, invoicesGenerated, ctx.y);

  ensureSpace(ctx, estimateCostPerMileSectionHeight(), ctx.pageCount > 0);
  ctx.y = drawCostPerMileSection(doc, data, ctx.y + 12);

  if (data.jobSummary.length > 0) {
    let jobIndex = 0;
    let includeJobHeader = true;

    while (jobIndex < data.jobSummary.length) {
      const remainingRows = data.jobSummary.length - jobIndex;
      const headerHeight = includeJobHeader ? 28 : 0;
      ensureSpace(
        ctx,
        headerHeight + Math.min(remainingRows, 1) * 16,
        ctx.pageCount > 0
      );

      const { endY, rowsDrawn } = drawJobSummaryRows(
        doc,
        data.jobSummary.slice(jobIndex),
        ctx.y,
        includeJobHeader
      );

      if (rowsDrawn === 0) {
        startNewPage(ctx, true);
        includeJobHeader = true;
        continue;
      }

      ctx.y = endY;
      jobIndex += rowsDrawn;
      includeJobHeader = false;
    }
  }

  finalizeFooters(doc);
  doc.save(`tvault-tax-summary-${data.range.start}.pdf`);
}

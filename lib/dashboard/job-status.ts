import type { Job, JobBorderStatus, DashboardJobView, JobDocument } from "@/types/jobs";
import { daysBetweenToday } from "@/lib/dashboard/format";
import {
  countRequiredDocs,
  isInvoiceGenerated,
} from "@/lib/job-folder/documents";

export function getJobBorderStatus(
  job: Job,
  documents: JobDocument[] = []
): JobBorderStatus {
  if (job.status === "cancelled") return "cancelled";

  const { complete, total } = countRequiredDocs(documents);
  const docsMissing = complete < total;
  const invoiceReady = isInvoiceGenerated(documents);

  const isOverdue =
    (job.status === "awaiting_payment" || !job.payment_received) &&
    Boolean(job.payment_expected_date) &&
    daysBetweenToday(job.payment_expected_date!) > 0;

  if (docsMissing) return "docs_missing";
  if (isOverdue) return "payment_overdue";
  if (!invoiceReady && complete === total) return "invoice_pending";
  if (complete === total && invoiceReady) return "docs_complete";
  return "docs_missing";
}

export function getBorderColor(status: JobBorderStatus): string {
  switch (status) {
    case "docs_complete":
      return "var(--color-success)";
    case "invoice_pending":
      return "var(--color-warning)";
    case "docs_missing":
    case "payment_overdue":
      return "var(--color-danger)";
    case "cancelled":
      return "var(--color-disabled)";
    default:
      return "var(--color-border)";
  }
}

export function getStatusBadge(job: Job, borderStatus: JobBorderStatus) {
  if (job.status === "cancelled") {
    return { label: "Cancelled", tone: "disabled" as const };
  }
  if (job.status === "awaiting_payment") {
    return { label: "Awaiting payment", tone: "warning" as const };
  }
  if (job.status === "paid") {
    return { label: "Paid", tone: "success" as const };
  }
  if (borderStatus === "payment_overdue") {
    return { label: "Payment overdue", tone: "danger" as const };
  }
  if (borderStatus === "docs_missing") {
    return { label: "Docs missing", tone: "danger" as const };
  }
  if (borderStatus === "invoice_pending") {
    return { label: "Invoice pending", tone: "warning" as const };
  }
  return { label: "Docs complete", tone: "success" as const };
}

export function toDashboardJob(
  job: Job,
  documents: JobDocument[] = []
): DashboardJobView {
  const borderStatus = getJobBorderStatus(job, documents);
  const { complete, total } = countRequiredDocs(documents);
  const badge = getStatusBadge(job, borderStatus);

  return {
    ...job,
    docsComplete: complete,
    docsTotal: total,
    borderStatus,
    statusLabel: badge.label,
    statusTone: badge.tone,
  };
}

export function isJobCompletedInMonth(
  job: Job,
  start: string,
  end: string
): boolean {
  const completedStatuses = new Set([
    "complete",
    "completed",
    "paid",
    "awaiting_payment",
  ]);
  if (!completedStatuses.has(job.status)) return false;
  const completionDate =
    job.delivery_date || job.updated_at?.slice(0, 10) || null;
  if (!completionDate) return false;
  return completionDate >= start && completionDate <= end;
}

export function isExpenseInMonth(
  expenseDate: string | null,
  createdAt: string | null,
  start: string,
  end: string
): boolean {
  const date = expenseDate || createdAt?.slice(0, 10) || null;
  if (!date) return false;
  return date >= start && date <= end;
}

export function groupDocumentsByJob(
  documents: JobDocument[]
): Record<string, JobDocument[]> {
  return documents.reduce<Record<string, JobDocument[]>>((acc, doc) => {
    if (!acc[doc.job_id]) acc[doc.job_id] = [];
    acc[doc.job_id].push(doc);
    return acc;
  }, {});
}

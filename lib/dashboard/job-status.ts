import type { Job, JobBorderStatus, DashboardJobView } from "@/types/jobs";
import { daysBetweenToday } from "@/lib/dashboard/format";

export const REQUIRED_DOC_FIELDS = [
  "rate_confirmation_url",
  "bol_url",
  "pod_url",
] as const;

export function countRequiredDocs(job: Job): { complete: number; total: number } {
  const total = REQUIRED_DOC_FIELDS.length;
  const complete = REQUIRED_DOC_FIELDS.filter(
    (field) => Boolean(job[field])
  ).length;
  return { complete, total };
}

export function getJobBorderStatus(job: Job): JobBorderStatus {
  if (job.status === "cancelled") return "cancelled";

  const { complete, total } = countRequiredDocs(job);
  const docsMissing = complete < total;

  const isOverdue =
    !job.payment_received &&
    Boolean(job.payment_expected_date) &&
    daysBetweenToday(job.payment_expected_date!) > 0;

  if (docsMissing) return "docs_missing";
  if (isOverdue) return "payment_overdue";
  if (!job.payment_received && job.invoice_sent_date) return "invoice_pending";
  if (complete === total) return "docs_complete";
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
  if (borderStatus === "payment_overdue") {
    return { label: "Payment overdue", tone: "danger" as const };
  }
  if (borderStatus === "docs_missing") {
    return { label: "Docs missing", tone: "danger" as const };
  }
  if (borderStatus === "invoice_pending") {
    return { label: "Awaiting payment", tone: "warning" as const };
  }
  return { label: "Docs complete", tone: "success" as const };
}

export function toDashboardJob(job: Job): DashboardJobView {
  const borderStatus = getJobBorderStatus(job);
  const { complete, total } = countRequiredDocs(job);
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

export function isJobCompletedInMonth(job: Job, start: string, end: string): boolean {
  if (job.status !== "completed") return false;
  const completionDate = job.delivery_date || job.updated_at?.slice(0, 10) || null;
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

import type { AwaitingPaymentItem, Job, Payment } from "@/types/jobs";
import { daysBetweenToday } from "@/lib/dashboard/format";

export function buildAwaitingPayments(
  jobs: Job[],
  payments: Payment[]
): AwaitingPaymentItem[] {
  const items: AwaitingPaymentItem[] = [];
  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  payments
    .filter((payment) => payment.status === "pending" || !payment.received_date)
    .forEach((payment) => {
      const job = jobMap.get(payment.job_id);
      if (!job) return;

      const expectedDate = payment.expected_date || job.payment_expected_date;
      const daysOverdue = expectedDate ? daysBetweenToday(expectedDate) : 0;

      items.push({
        id: payment.id,
        jobId: job.id,
        jobName: job.job_name,
        amount: payment.amount ?? job.load_value ?? 0,
        expectedDate,
        daysOverdue: Math.max(daysOverdue, 0),
        isOverdue: daysOverdue > 0,
      });
    });

  jobs
    .filter(
      (job) =>
        job.status === "awaiting_payment" &&
        !job.payment_received &&
        job.invoice_sent_date
    )
    .forEach((job) => {
      if (items.some((item) => item.jobId === job.id)) return;

      const expectedDate = job.payment_expected_date;
      const daysOverdue = expectedDate ? daysBetweenToday(expectedDate) : 0;

      items.push({
        id: `job-payment-${job.id}`,
        jobId: job.id,
        jobName: job.job_name,
        amount: job.load_value ?? 0,
        expectedDate: expectedDate ?? null,
        daysOverdue: Math.max(daysOverdue, 0),
        isOverdue: daysOverdue > 0,
      });
    });

  jobs
    .filter((job) => job.status === "awaiting_payment")
    .forEach((job) => {
      if (items.some((item) => item.jobId === job.id)) return;

      const expectedDate = job.payment_expected_date;
      const daysOverdue = expectedDate ? daysBetweenToday(expectedDate) : 0;

      items.push({
        id: `job-awaiting-${job.id}`,
        jobId: job.id,
        jobName: job.job_name,
        amount: job.load_value ?? 0,
        expectedDate: expectedDate ?? null,
        daysOverdue: Math.max(daysOverdue, 0),
        isOverdue: daysOverdue > 0,
      });
    });

  return items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.expectedDate && b.expectedDate) {
      return a.expectedDate.localeCompare(b.expectedDate);
    }
    return b.daysOverdue - a.daysOverdue;
  });
}

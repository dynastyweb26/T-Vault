import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/types/jobs";
import type { BrokerRating, BrokerRatingOutcome } from "@/types/job-folder";
import { buildBrokerBadge } from "@/lib/job-folder/broker-ratings";

export interface BrokerHistoryEntry {
  brokerName: string;
  rating: BrokerRating | null;
  badge: ReturnType<typeof buildBrokerBadge>;
  loadsCompleted: number;
  avgDaysToPay: number | null;
  lastWorkedAt: string | null;
  jobs: Job[];
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export function computeDaysToPay(job: Job): number | null {
  if (!job.payment_received_date || !job.invoice_sent_date) return null;
  return daysBetween(job.invoice_sent_date, job.payment_received_date);
}

export function ratingOutcomeLabel(
  rating: BrokerRatingOutcome | string | null
): string {
  switch (rating) {
    case "on_time":
      return "Paid on time";
    case "late":
      return "Paid late";
    case "problem":
      return "Payment problem";
    default:
      return "Not rated";
  }
}

export async function fetchBrokerHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<BrokerHistoryEntry[]> {
  const [ratingsResult, jobsResult] = await Promise.all([
    supabase.from("broker_ratings").select("*").eq("user_id", userId),
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .neq("is_template", true)
      .not("broker_name", "is", null)
      .in("status", ["paid", "complete", "completed", "awaiting_payment"])
      .order("updated_at", { ascending: false }),
  ]);

  const ratings = (ratingsResult.data ?? []) as BrokerRating[];
  const jobs = (jobsResult.data ?? []) as Job[];

  const byBroker = new Map<string, Job[]>();
  jobs.forEach((job) => {
    const name = job.broker_name?.trim();
    if (!name) return;
    if (!byBroker.has(name)) byBroker.set(name, []);
    byBroker.get(name)!.push(job);
  });

  const entries: BrokerHistoryEntry[] = [];

  byBroker.forEach((brokerJobs, brokerName) => {
    const rating =
      ratings.find((r) => r.broker_name === brokerName) ?? null;
    const paidJobs = brokerJobs.filter((j) => j.status === "paid");
    const daysList = paidJobs
      .map(computeDaysToPay)
      .filter((d): d is number => d !== null);
    const avgDaysToPay =
      daysList.length > 0
        ? daysList.reduce((s, d) => s + d, 0) / daysList.length
        : rating?.avg_days_to_pay ?? null;

    const lastWorkedAt =
      brokerJobs[0]?.updated_at ??
      brokerJobs[0]?.delivery_date ??
      null;

    entries.push({
      brokerName,
      rating,
      badge: buildBrokerBadge(rating, brokerJobs.length),
      loadsCompleted: brokerJobs.length,
      avgDaysToPay,
      lastWorkedAt,
      jobs: brokerJobs,
    });
  });

  return entries.sort((a, b) =>
    (b.lastWorkedAt ?? "").localeCompare(a.lastWorkedAt ?? "")
  );
}

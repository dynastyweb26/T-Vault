import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrokerRatingOutcome } from "@/types/job-folder";
import { TEXT_LIMITS } from "@/lib/constants";
import { sanitizeText } from "@/lib/validation";
import { fetchBrokerRating } from "@/lib/job-folder/broker-ratings";
import { computeDaysToPay } from "@/lib/broker-history/queries";
import type { Job } from "@/types/jobs";

export async function saveJobBrokerRating(
  supabase: SupabaseClient,
  userId: string,
  job: Pick<
    Job,
    | "id"
    | "broker_name"
    | "invoice_sent_date"
    | "payment_received_date"
    | "payment_expected_date"
  >,
  rating: BrokerRatingOutcome,
  notes?: string
): Promise<void> {
  const brokerName = job.broker_name?.trim();
  if (!brokerName) return;

  const safeNotes = notes
    ? sanitizeText(notes).slice(0, TEXT_LIMITS.brokerRatingNotes)
    : null;

  await supabase
    .from("jobs")
    .update({
      broker_rating: rating,
      broker_rating_notes: safeNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("user_id", userId);

  const existing = await fetchBrokerRating(supabase, userId, brokerName);
  const daysToPay = computeDaysToPay(job as Job);

  const onTimeInc = rating === "on_time" ? 1 : 0;
  const lateInc = rating === "late" ? 1 : 0;
  const problemInc = rating === "problem" ? 1 : 0;

  if (existing) {
    const newTotal = existing.total_loads + 1;
    const prevAvg = existing.avg_days_to_pay ?? 0;
    const newAvg =
      daysToPay !== null
        ? ((prevAvg * existing.total_loads) + daysToPay) / newTotal
        : existing.avg_days_to_pay;

    await supabase
      .from("broker_ratings")
      .update({
        total_loads: newTotal,
        on_time_count: existing.on_time_count + onTimeInc,
        late_count: existing.late_count + lateInc,
        problem_count: existing.problem_count + problemInc,
        avg_days_to_pay: newAvg,
        last_worked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", userId);
    return;
  }

  await supabase.from("broker_ratings").insert({
    user_id: userId,
    broker_name: brokerName,
    total_loads: 1,
    on_time_count: onTimeInc,
    late_count: lateInc,
    problem_count: problemInc,
    detention_unpaid_count: 0,
    avg_days_to_pay: daysToPay,
    last_worked_at: new Date().toISOString(),
  });
}

export async function markJobAsPaid(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<Job | null> {
  const paidDate = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("jobs")
    .update({
      status: "paid",
      payment_received: true,
      payment_received_date: paidDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  return (data as Job | null) ?? null;
}

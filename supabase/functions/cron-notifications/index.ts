import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function insertNotification(
  admin: ReturnType<typeof createClient>,
  userId: string,
  type: string,
  title: string,
  body: string,
  deepLink: string
): Promise<void> {
  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    deep_link: deepLink,
  });
}

async function runWeeklyEarnings(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const now = new Date();
  const day = now.getUTCDay();
  if (day !== 5) return 0;

  const hour = now.getUTCHours();
  if (hour !== 17) return 0;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString();

  const { data: users } = await admin
    .from("users")
    .select("id, total_lifetime_earnings, total_lifetime_loads, best_month_earnings")
    .gte("last_active_date", toDateString(new Date(now.getTime() - 7 * 86400000)));

  let sent = 0;
  for (const user of users ?? []) {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("weekly_earnings")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefs && prefs.weekly_earnings === false) continue;

    const weekStart = new Date(now.getTime() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);

    const { data: jobs } = await admin
      .from("jobs")
      .select("load_value, status, updated_at")
      .eq("user_id", user.id)
      .in("status", ["awaiting_payment", "paid", "complete", "completed"])
      .gte("updated_at", weekAgo);

    const weekEarnings = (jobs ?? []).reduce(
      (sum, j) => sum + (j.load_value ?? 0),
      0
    );
    const loadCount = jobs?.length ?? 0;

    if (loadCount === 0) continue;

    const avgPerLoad =
      (user.total_lifetime_earnings ?? 0) /
      Math.max(user.total_lifetime_loads ?? 1, 1);
    const weekAvg = weekEarnings / loadCount;

    let comment = "Keep the momentum going next week.";
    if (weekEarnings > (user.best_month_earnings ?? 0)) {
      comment = "Your best week yet.";
    } else if (weekAvg >= avgPerLoad) {
      comment = "A strong week.";
    }

    const formatted = weekEarnings.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

    await insertNotification(
      admin,
      user.id,
      "weekly_earnings",
      "Your week in numbers",
      `${formatted} earned across ${loadCount} loads. ${comment}`,
      "/tax-summary?range=this_week"
    );
    sent++;
  }
  return sent;
}

async function runDocumentExpiry(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const { data: docs } = await admin
    .from("user_documents")
    .select("*")
    .not("expiry_date", "is", null);

  let sent = 0;
  for (const doc of docs ?? []) {
    if (!doc.expiry_date) continue;
    const days = daysUntil(doc.expiry_date);
    const name = doc.custom_name || doc.document_type.replace(/_/g, " ");

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("document_expiry")
      .eq("user_id", doc.user_id)
      .maybeSingle();

    if (prefs && prefs.document_expiry === false) continue;

    if (days <= 60 && days > 30 && !doc.reminder_sent_60) {
      await insertNotification(
        admin,
        doc.user_id,
        "document_expiry",
        "Document renewal reminder",
        `Your ${name} expires in 60 days. Upload a renewal anytime.`,
        "/documents"
      );
      await admin
        .from("user_documents")
        .update({ reminder_sent_60: true })
        .eq("id", doc.id)
        .eq("user_id", doc.user_id);
      sent++;
    } else if (days <= 30 && days > 7 && !doc.reminder_sent_30) {
      await insertNotification(
        admin,
        doc.user_id,
        "document_expiry",
        "Document expiring soon",
        `${name} expires in 30 days. Time to schedule renewal.`,
        "/documents"
      );
      await admin
        .from("user_documents")
        .update({ reminder_sent_30: true })
        .eq("id", doc.id)
        .eq("user_id", doc.user_id);
      sent++;
    } else if (days <= 7 && days >= 0 && !doc.reminder_sent_7) {
      await insertNotification(
        admin,
        doc.user_id,
        "document_expiry",
        "Document expiring soon",
        `${name} expires in 7 days. Don't get caught without it.`,
        "/documents"
      );
      await admin
        .from("user_documents")
        .update({ reminder_sent_7: true })
        .eq("id", doc.id)
        .eq("user_id", doc.user_id);
      sent++;
    }
  }
  return sent;
}

async function runStreakAtRisk(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const now = new Date();
  const hour = now.getUTCHours();
  if (hour !== 20) return 0;

  const today = toDateString(now);

  const { data: users } = await admin
    .from("users")
    .select("id, streak_days, last_active_date")
    .gte("streak_days", 3);

  let sent = 0;
  for (const user of users ?? []) {
    if (!user.last_active_date || user.last_active_date >= today) continue;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("streak_at_risk")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefs && prefs.streak_at_risk === false) continue;

    await insertNotification(
      admin,
      user.id,
      "streak_at_risk",
      "Streak at risk",
      `Don't break your ${user.streak_days}-day streak. Log in to keep it going.`,
      "/dashboard"
    );
    sent++;
  }
  return sent;
}

async function runMissingDocs(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id, user_id, job_name, status, created_at")
    .eq("status", "active")
    .lt("created_at", cutoff);

  let sent = 0;
  for (const job of jobs ?? []) {
    const { data: docs } = await admin
      .from("documents")
      .select("document_type")
      .eq("job_id", job.id)
      .eq("user_id", job.user_id);

    const types = new Set((docs ?? []).map((d) => d.document_type));
    const required = ["rate_confirmation", "bol", "pod"];
    const missing = required.filter((t) => !types.has(t));
    if (!missing.length) continue;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("missing_docs")
      .eq("user_id", job.user_id)
      .maybeSingle();

    if (prefs && prefs.missing_docs === false) continue;

    await insertNotification(
      admin,
      job.user_id,
      "missing_docs",
      "Missing documents",
      `${job.job_name}: ${missing.length} required document(s) still missing.`,
      `/loads/${job.id}`
    );
    sent++;
  }
  return sent;
}

async function runInvoiceReminder(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id, user_id, job_name, status, updated_at")
    .in("status", ["complete", "completed", "awaiting_payment"])
    .lt("updated_at", cutoff);

  let sent = 0;
  for (const job of jobs ?? []) {
    const { data: invoice } = await admin
      .from("documents")
      .select("id")
      .eq("job_id", job.id)
      .eq("user_id", job.user_id)
      .eq("document_type", "invoice")
      .maybeSingle();

    if (invoice) continue;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("invoice_reminder")
      .eq("user_id", job.user_id)
      .maybeSingle();

    if (prefs && prefs.invoice_reminder === false) continue;

    await insertNotification(
      admin,
      job.user_id,
      "invoice_reminder",
      "Invoice not generated",
      `Complete load "${job.job_name}" — generate your invoice.`,
      `/loads/${job.id}`
    );
    sent++;
  }
  return sent;
}

async function runPaymentOverdue(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const today = toDateString(new Date());

  const { data: payments } = await admin
    .from("payments")
    .select("*, jobs!inner(job_name, broker_name)")
    .eq("status", "pending")
    .lt("expected_date", today);

  let sent = 0;
  for (const payment of payments ?? []) {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("payment_overdue")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    if (prefs && prefs.payment_overdue === false) continue;

    const daysOver = daysUntil(payment.expected_date) * -1;
    const amount = Number(payment.amount ?? 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const broker =
      (payment.jobs as { broker_name?: string })?.broker_name ?? "broker";

    await insertNotification(
      admin,
      payment.user_id,
      "payment_overdue",
      "Payment overdue",
      `Invoice ${payment.invoice_number ?? ""} for ${amount} is ${daysOver} days overdue. Follow up with ${broker}.`,
      `/loads/${payment.job_id}`
    );
    sent++;
  }
  return sent;
}

async function runWelcome(
  admin: ReturnType<typeof createClient>
): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const olderCutoff = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

  const { data: users } = await admin
    .from("users")
    .select("id, created_at")
    .lt("created_at", cutoff)
    .gt("created_at", olderCutoff);

  let sent = 0;
  for (const user of users ?? []) {
    const { count } = await admin
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_template", false);

    if ((count ?? 0) > 0) continue;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("welcome")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefs && prefs.welcome === false) continue;

    await insertNotification(
      admin,
      user.id,
      "welcome",
      "Welcome to T-Vault",
      "Ready for your first load? Tap + to create one and stay organized.",
      "/new-job"
    );
    sent++;
  }
  return sent;
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const cronSecretTrimmed = cronSecret?.trim() ?? "";
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");

    if (!cronSecretTrimmed) {
      return jsonResponse(req, { error: "server_misconfigured" }, 503);
    }

    if (cronHeader !== cronSecretTrimmed && !authHeader) {
      return jsonResponse(req, { error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!serviceRoleKey) {
      return jsonResponse(req, { error: "server_misconfigured" }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { task } = await req.json().catch(() => ({ task: "all" }));

    const results: Record<string, number> = {};

    if (task === "all" || task === "weekly_earnings") {
      results.weekly_earnings = await runWeeklyEarnings(admin);
    }
    if (task === "all" || task === "document_expiry") {
      results.document_expiry = await runDocumentExpiry(admin);
    }
    if (task === "all" || task === "streak_at_risk") {
      results.streak_at_risk = await runStreakAtRisk(admin);
    }
    if (task === "all" || task === "missing_docs") {
      results.missing_docs = await runMissingDocs(admin);
    }
    if (task === "all" || task === "invoice_reminder") {
      results.invoice_reminder = await runInvoiceReminder(admin);
    }
    if (task === "all" || task === "payment_overdue") {
      results.payment_overdue = await runPaymentOverdue(admin);
    }
    if (task === "all" || task === "welcome") {
      results.welcome = await runWelcome(admin);
    }

    return jsonResponse(req, { ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("cron-notifications error:", message);
    return jsonResponse(req, { error: "cron_failed" }, 500);
  }
});

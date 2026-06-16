"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useJobFolder } from "@/hooks/use-job-folder";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { triggerHaptic } from "@/lib/haptics";
import { saveLoadsScrollPosition } from "@/lib/job-folder/scroll";
import {
  countOptionalDocs,
  countRequiredDocs,
  getDocument,
  hasDocument,
  isChecklistComplete,
  missingChecklistItems,
} from "@/lib/job-folder/documents";
import {
  calculateDetentionOwed,
  formatDuration,
  formatTimerDisplay,
  isDetentionBillable,
  DETENTION_FREE_MINUTES,
} from "@/lib/job-folder/detention";
import { generateDetentionInvoicePdf } from "@/lib/job-folder/detention-invoice";
import { generateAndSaveLoadInvoice } from "@/lib/job-folder/invoice";
import { uploadJobDocument, saveDocumentFromBlob } from "@/lib/job-folder/upload";
import {
  detectNewMilestones,
  fetchAchievedMilestones,
  saveMilestone,
  updateUserStatsOnComplete,
} from "@/lib/job-folder/milestones";
import {
  buildBrokerBadge,
  fetchBrokerHistory,
  fetchBrokerRating,
  updateBrokerDetentionOutcome,
} from "@/lib/job-folder/broker-ratings";
import { estimateMiles } from "@/lib/job-folder/mileage";
import {
  DOC_TYPE_LABELS,
  getDetentionRate,
  JOB_EXPENSE_CATEGORIES,
  REQUIRED_DOC_TYPES,
  truncateTitle,
  type RequiredDocType,
} from "@/lib/job-folder/constants";
import { formatCurrency, formatCurrencyDetailed, formatShortDate } from "@/lib/dashboard/format";
import { updateStreak } from "@/lib/streak";
import { APP_ROUTES, TEXT_LIMITS } from "@/lib/constants";
import type { BrokerBadgeInfo, DetentionLocation, MilestoneCheck } from "@/types/job-folder";
import type { AiConfidence, JobDocument } from "@/types/jobs";

const badgeToneClasses = {
  high: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  medium: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  low: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  unread: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
};

function TrustBadge({ confidence }: { confidence: AiConfidence | null }) {
  if (!confidence || confidence === "low" || confidence === "unread") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[12px] ${badgeToneClasses.low}`}>
        <AlertTriangle className="size-3.5" strokeWidth={2} />
        Enter manually
      </span>
    );
  }
  if (confidence === "medium") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[12px] ${badgeToneClasses.medium}`}>
        <AlertTriangle className="size-3.5" strokeWidth={2} />
        AI — please check
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[12px] ${badgeToneClasses.high}`}>
      <Bot className="size-3.5" strokeWidth={2} />
      AI verified
    </span>
  );
}

function fieldConfidence(
  documents: JobDocument[],
  type: RequiredDocType
): AiConfidence | null {
  return getDocument(documents, type)?.ai_confidence ?? null;
}

export function JobFolderView({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const {
    job,
    documents,
    expenses,
    detentionSessions,
    activeSession,
    loading,
    error,
    refresh,
    updateJob,
    setActiveSession,
  } = useJobFolder(jobId);

  const [moreOpen, setMoreOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [uploadType, setUploadType] = useState<string | null>(null);
  const [qualityIssue, setQualityIssue] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const [showEarnedBanner, setShowEarnedBanner] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState("");
  const [milestone, setMilestone] = useState<MilestoneCheck | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [brokerBadge, setBrokerBadge] = useState<BrokerBadgeInfo | null>(null);
  const [brokerSheetOpen, setBrokerSheetOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [detentionResult, setDetentionResult] = useState<{
    minutes: number;
    location: DetentionLocation;
    sessionId: string;
  } | null>(null);
  const [detentionHistoryOpen, setDetentionHistoryOpen] = useState(false);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "fuel",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    noReceipt: false,
    noReceiptReason: "",
  });

  useEffect(() => {
    if (!job?.broker_name || !user) return;
    (async () => {
      const supabase = createClient();
      const rating = await fetchBrokerRating(supabase, user.id, job.broker_name);
      const history = await fetchBrokerHistory(supabase, user.id, job.broker_name!, jobId);
      const badge = buildBrokerBadge(rating, history.length);
      if (badge) {
        badge.history = history.map((h) => ({
          jobName: h.job_name,
          status: h.status,
          amount: h.load_value ?? 0,
          paidOnTime: h.status === "paid",
        }));
      }
      setBrokerBadge(badge);
    })();
  }, [job?.broker_name, jobId, user]);

  useEffect(() => {
    if (!activeSession) return;
    const start = new Date(activeSession.timer_start).getTime();
    const tick = () => setTimerSeconds(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeSession]);

  useEffect(() => {
    if (!paymentSheetOpen) return;
    const defaultDays = job?.payment_type === "factoring" ? 2 : 30;
    const d = new Date();
    d.setDate(d.getDate() + defaultDays);
    setPaymentDate(d.toISOString().slice(0, 10));
  }, [paymentSheetOpen, job?.payment_type]);

  useEffect(() => {
    if (isChecklistComplete(documents) && job?.status === "active") {
      setShowCompleteBanner(true);
      triggerHaptic("medium");
      const t = window.setTimeout(() => setShowCompleteBanner(false), 2200);
      return () => window.clearTimeout(t);
    }
  }, [documents, job?.status]);

  if (loading) {
    return <div className="tv-skeleton mt-6 h-96 rounded-[var(--radius-card)]" />;
  }

  if (error || !job) {
    return (
      <p className="mt-6 text-[15px] text-[var(--color-danger-text)]">
        {error ?? "Load not found."}
      </p>
    );
  }

  const { complete, total } = countRequiredDocs(documents);
  const optionalCount = countOptionalDocs(documents);
  const hasLumperExpense = expenses.some((e) => e.category === "lumper");
  const checklistComplete = isChecklistComplete(documents);
  const missing = missingChecklistItems(documents);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const estMiles = estimateMiles(job.pickup_location, job.delivery_location);

  const statusBanner = (() => {
    if (job.status === "cancelled")
      return { bg: "bg-[var(--color-disabled)]", text: "Cancelled", icon: null };
    if (job.status === "paid")
      return { bg: "bg-[var(--color-success-bg)]", text: "Paid", icon: Check };
    if (job.status === "awaiting_payment")
      return { bg: "bg-[var(--color-warning-bg)]", text: "Awaiting Payment", icon: Clock };
    if (job.status === "complete" || job.status === "completed")
      return { bg: "bg-[var(--color-success-bg)]", text: "Complete", icon: Check };
    return { bg: "bg-[var(--color-accent)]", text: "Active", icon: null };
  })();

  const startDetention = async (location: DetentionLocation) => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("detention_sessions")
      .insert({
        user_id: user.id,
        job_id: jobId,
        location_type: location,
        timer_start: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (data) {
      setActiveSession(data as typeof activeSession);
      await refresh();
    }
  };

  const stopDetention = async () => {
    if (!activeSession || !user) return;
    const end = new Date();
    const start = new Date(activeSession.timer_start);
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    const supabase = createClient();
    const { data } = await supabase
      .from("detention_sessions")
      .update({
        timer_end: end.toISOString(),
        total_minutes: minutes,
        amount_owed: calculateDetentionOwed(minutes, getDetentionRate()),
      })
      .eq("id", activeSession.id)
      .select("*")
      .single();

    setActiveSession(null);
    if (data) {
      setDetentionResult({
        minutes,
        location: activeSession.location_type as DetentionLocation,
        sessionId: activeSession.id,
      });
      await updateJob({
        detention_minutes: (job.detention_minutes ?? 0) + minutes,
      });
    }
    await refresh();
  };

  const saveDetentionOutcome = async (paid: "yes" | "no" | "waiting") => {
    if (!detentionResult || !user) return;
    const supabase = createClient();
    await supabase
      .from("detention_sessions")
      .update({ paid })
      .eq("id", detentionResult.sessionId);
    await updateBrokerDetentionOutcome(supabase, user.id, job.broker_name, paid);
    await updateJob({ detention_paid: paid });
    setDetentionResult(null);
    await refresh();
  };

  const handleFileSelect = async (file: File) => {
    if (!uploadType) return;
    setPendingFile(file);
    try {
      await uploadJobDocument(createClient(), {
        userId: user!.id,
        jobId,
        documentType: uploadType as RequiredDocType,
        file,
      });
      await refresh();
      setUploadType(null);
      setPendingFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "unsupported_type") {
        window.alert(
          "That file type isn't supported. Take a photo or upload a JPEG, PNG, or PDF."
        );
      } else if (message === "poor_quality") {
        setQualityIssue(true);
      } else {
        window.alert("Upload failed — check your connection and try again.");
      }
    }
  };

  const confirmComplete = async () => {
    if (!user || !checklistComplete) return;
    const supabase = createClient();
    await supabase
      .from("jobs")
      .update({ status: "awaiting_payment", updated_at: new Date().toISOString() })
      .eq("id", jobId);
    await updateStreak(supabase, user.id);
    await refreshProfile();
    setPaymentSheetOpen(true);
    await refresh();
  };

  const finalizePayment = async () => {
    if (!user || !job) return;
    const supabase = createClient();
    await supabase.from("payments").insert({
      user_id: user.id,
      job_id: jobId,
      amount: job.load_value,
      payment_type: job.payment_type,
      expected_date: paymentDate,
      status: "pending",
    });
    await supabase
      .from("jobs")
      .update({ payment_expected_date: paymentDate })
      .eq("id", jobId);

    const updatedProfile = await updateUserStatsOnComplete(
      supabase,
      user.id,
      job.load_value ?? 0
    );
    await refreshProfile();

    const achieved = await fetchAchievedMilestones(supabase, user.id);
    const monthEarnings = (updatedProfile?.best_month_earnings ?? 0);
    const newMilestones = updatedProfile
      ? detectNewMilestones(updatedProfile, monthEarnings, achieved)
      : [];

    if (newMilestones.length > 0) {
      await saveMilestone(supabase, user.id, newMilestones[0].type);
      setMilestone(newMilestones[0]);
      if (newMilestones[0].type === "first_load") {
        setTimeout(() => {
          setMilestone(null);
          setShowReferral(true);
        }, 3200);
      }
    } else {
      setShowEarnedBanner(true);
      triggerHaptic("strong");
      setTimeout(() => setShowEarnedBanner(false), 3200);
    }

    setPaymentSheetOpen(false);
    await refresh();
  };

  const StatusIcon = statusBanner.icon;

  return (
    <>
      <header className="sticky top-0 z-40 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Link
            href={APP_ROUTES.loads}
            onClick={saveLoadsScrollPosition}
            aria-label="Back to My Loads"
            className="flex size-11 shrink-0 items-center justify-center text-[var(--color-accent)]"
          >
            <ChevronLeft className="size-7" strokeWidth={2} />
          </Link>
          <h1 className="flex-1 truncate text-[20px] font-bold">
            {truncateTitle(job.job_name)}
          </h1>
          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex size-11 items-center justify-center"
            >
              <MoreVertical className="size-6" strokeWidth={2} />
            </button>
            {moreOpen ? (
              <div className="absolute right-0 z-10 mt-1 min-w-44 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1">
                {[
                  { label: "Edit Job Name", action: () => setEditField("job_name") },
                  { label: "Save as Template", action: async () => {
                    if (!user) return;
                    const { id: _id, ...rest } = job;
                    await createClient().from("jobs").insert({
                      ...rest,
                      is_template: true,
                      template_name: job.job_name,
                      updated_at: new Date().toISOString(),
                    });
                    setMoreOpen(false);
                  }},
                  { label: "Mark as Complete", action: confirmComplete, hidden: !checklistComplete },
                  { label: "Cancel Load", action: async () => {
                    if (window.confirm("Cancel this load? Documents will be preserved.")) {
                      await updateJob({ status: "cancelled" });
                      setMoreOpen(false);
                    }
                  }},
                  { label: "Delete Load", danger: true, action: async () => {
                    if (job.status !== "cancelled") {
                      window.alert("Cancel the load before deleting.");
                      return;
                    }
                    if (window.confirm("Delete permanently? This cannot be undone.")) {
                      if (!window.confirm("Are you absolutely sure?")) return;
                      await createClient().from("jobs").delete().eq("id", jobId);
                      router.push(APP_ROUTES.loads);
                    }
                  }},
                ].filter((i) => !i.hidden).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className={`flex w-full px-4 py-3 text-left text-[15px] ${
                      item.danger ? "text-[var(--color-danger-text)]" : "text-[var(--color-text-primary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className={`mt-3 flex items-center justify-center gap-2 rounded-[var(--radius-card)] px-4 py-2 ${statusBanner.bg}`}>
          {StatusIcon ? <StatusIcon className="size-5 text-[var(--color-success-text)]" strokeWidth={2} /> : null}
          <span className="text-[15px] font-medium">{statusBanner.text}</span>
        </div>
      </header>

      {showCompleteBanner ? (
        <div className="mt-3 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-success-bg)] px-4 py-3 text-center text-[15px] text-[var(--color-success-text)]">
          Required documents complete!
        </div>
      ) : null}

      {showEarnedBanner ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-accent)] px-4 py-3 text-[15px] font-medium text-[var(--color-on-accent)]">
          <DollarSign className="size-5" strokeWidth={2} />
          Load Complete — {formatCurrency(job.load_value ?? 0)} earned
        </div>
      ) : null}

      {/* Job Details */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="space-y-4">
          <div>
            <p className="text-[13px] uppercase text-[var(--color-text-muted)]">Broker Name</p>
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-bold">{job.broker_name || "Tap to add"}</p>
              {brokerBadge ? (
                <button
                  type="button"
                  onClick={() => setBrokerSheetOpen(true)}
                  className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[12px] ${
                    brokerBadge.tone === "success"
                      ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                      : brokerBadge.tone === "warning"
                        ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                        : "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                  }`}
                >
                  {brokerBadge.label}
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-[13px] uppercase text-[var(--color-text-muted)]">Load Value</p>
            <p className="text-[24px] font-bold text-[var(--color-accent)]">
              {job.load_value ? formatCurrencyDetailed(job.load_value) : "Tap to add"}
            </p>
          </div>
          <div>
            <p className="text-[13px] uppercase text-[var(--color-text-muted)]">Route</p>
            <p className="text-[17px] font-bold">
              {job.pickup_location || "Pickup"} → {job.delivery_location || "Delivery"}
            </p>
            {estMiles ? (
              <button
                type="button"
                onClick={() => updateJob({ miles: estMiles })}
                className="mt-1 text-[14px] text-[var(--color-accent)]"
              >
                Est. {estMiles} miles · Tap to use
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="mt-4 flex h-14 w-full items-center justify-between text-[15px] text-[var(--color-accent)]"
        >
          More Details
          <ChevronDown className={`size-5 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} strokeWidth={2} />
        </button>
        <div className={`grid transition-all duration-200 ${detailsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden space-y-3 pt-2">
            {[
              ["pickup_date", "Pickup Date"],
              ["delivery_date", "Delivery Date"],
              ["miles", "Miles"],
              ["payment_type", "Payment Type"],
              ["notes", "Notes"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] uppercase text-[var(--color-text-muted)]">{label}</p>
                  <p className="text-[17px] font-bold">
                    {(job[key as keyof typeof job] as string | number | null)?.toString() || "Tap to add"}
                  </p>
                </div>
                <button type="button" aria-label={`Edit ${label}`} onClick={() => { setEditField(key); setEditValue(String(job[key as keyof typeof job] ?? "")); }} className="text-[var(--color-accent)]">
                  <Pencil className="size-6" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="mt-6">
        <h2 className="text-[20px] font-medium">Documents</h2>
        <p className={`mt-1 text-[14px] ${complete === total ? "text-[var(--color-success-text)]" : "text-[var(--color-text-secondary)]"}`}>
          {complete} of {total} required docs uploaded
        </p>
        <p className="text-[13px] text-[var(--color-text-muted)]">{optionalCount} optional docs added</p>
        <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--color-surface-elevated)]">
          <div className="h-full rounded bg-[var(--color-accent)] transition-all duration-300" style={{ width: `${(complete / total) * 100}%` }} />
        </div>
        <div className="mt-4 space-y-2">
          {REQUIRED_DOC_TYPES.map((type) => {
            const uploaded = hasDocument(documents, type);
            return (
              <div key={type} className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
                <span className={`size-3 shrink-0 rounded-full ${uploaded ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                <div className="flex-1">
                  <p className="font-medium">{DOC_TYPE_LABELS[type]}</p>
                  {!uploaded ? <p className="text-[13px] text-[var(--color-text-muted)]">Tap to upload</p> : null}
                  <TrustBadge confidence={fieldConfidence(documents, type)} />
                </div>
                {uploaded ? (
                  <button type="button" className="h-11 rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 text-[14px]" onClick={() => window.open(getDocument(documents, type)?.file_url, "_blank")}>View</button>
                ) : (
                  <button type="button" aria-label="Upload document" className="h-11 rounded-[var(--radius-input)] border border-[var(--color-accent)] px-3 text-[14px] text-[var(--color-accent)]" onClick={() => setUploadType(type)}>Upload</button>
                )}
              </div>
            );
          })}
          <div className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
            <span className={`size-3 shrink-0 rounded-full ${hasDocument(documents, "invoice") ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
            <p className="flex-1 font-medium">Invoice</p>
            {hasDocument(documents, "invoice") ? (
              <button type="button" className="h-11 rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 text-[14px]" onClick={() => window.open(getDocument(documents, "invoice")?.file_url, "_blank")}>Download</button>
            ) : (
              <button type="button" className="h-11 rounded-[var(--radius-input)] bg-[var(--color-accent)] px-3 text-[14px] text-[var(--color-on-accent)]" onClick={async () => {
                if (!user) return;
                setUploading(true);
                await generateAndSaveLoadInvoice(createClient(), { job, profile, userId: user.id });
                await refresh();
                setUploading(false);
              }}>{uploading ? "..." : "Generate Invoice"}</button>
            )}
          </div>
          {hasLumperExpense ? (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4 space-y-2">
              {(["fuel_receipt", "lumper_receipt"] as const).map((type) => (
                <div key={type} className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
                  <span className={`size-3 shrink-0 rounded-full ${hasDocument(documents, type) ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                  <p className="flex-1 font-medium">{DOC_TYPE_LABELS[type]}</p>
                  <button type="button" className="h-11 rounded-[var(--radius-input)] border border-[var(--color-accent)] px-3 text-[14px] text-[var(--color-accent)]" onClick={() => setUploadType(type)}>Upload</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Detention */}
      <section className="mt-6">
        <h2 className="text-[20px] font-medium">Detention</h2>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Brokers owe you after 2 hours of waiting. Document it — it&apos;s your money.
        </p>
        {activeSession ? (
          <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-success)] bg-[var(--color-success-bg)] p-5 text-center">
            <Clock className="mx-auto size-7 animate-spin text-[var(--color-success)]" style={{ animationDuration: "4s" }} strokeWidth={2} />
            <p className="mt-3 font-mono text-[40px] font-bold">{formatTimerDisplay(timerSeconds)}</p>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              At {activeSession.location_type === "pickup" ? "Pickup" : "Delivery"}
            </p>
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              Free time: 2 hours. After that, you&apos;re owed money.
            </p>
            <TvButton variant="secondary" className="mt-4 border-[var(--color-danger)] text-[var(--color-danger-text)]" onClick={stopDetention}>
              Stop Timer
            </TvButton>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => startDetention("pickup")} className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-success)] text-[15px] text-[var(--color-success-text)]">
              <Clock className="size-5" strokeWidth={2} /> At Pickup
            </button>
            <button type="button" onClick={() => startDetention("delivery")} className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-success)] text-[15px] text-[var(--color-success-text)]">
              <MapPin className="size-5" strokeWidth={2} /> At Delivery
            </button>
          </div>
        )}
        {detentionSessions.length > 0 ? (
          <button type="button" onClick={() => setDetentionHistoryOpen((o) => !o)} className="mt-3 text-[14px] text-[var(--color-accent)]">
            Past detention on this load
          </button>
        ) : null}
        {detentionHistoryOpen ? (
          <div className="mt-2 space-y-2">
            {detentionSessions.filter((s) => s.timer_end).map((s) => (
              <p key={s.id} className="text-[14px] text-[var(--color-text-secondary)]">
                {s.location_type}: {formatDuration(s.total_minutes ?? 0)}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      {/* Expenses */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-medium">Load Expenses</h2>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--color-accent)]">{formatCurrencyDetailed(expenseTotal)}</span>
            <button type="button" aria-label="Add expense" onClick={() => setExpenseSheetOpen(true)} className="text-[var(--color-accent)]">
              <Plus className="size-6" strokeWidth={2} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Costs for this load. For truck expenses, use the Expenses tab.
        </p>
        <div className="mt-3 space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
              <Receipt className="size-6 text-[var(--color-accent)]" strokeWidth={2} />
              <div className="flex-1">
                <p className="font-medium capitalize">{exp.category}</p>
                <p className="text-[13px] text-[var(--color-text-muted)]">{exp.description || "—"}</p>
              </div>
              <p className="font-bold text-[var(--color-danger-text)]">{formatCurrencyDetailed(exp.amount)}</p>
              {exp.receipt_url ? <FileText className="size-5 text-[var(--color-success-text)]" strokeWidth={2} /> : <AlertCircle className="size-5 text-[var(--color-warning-text)]" strokeWidth={2} />}
            </div>
          ))}
        </div>
      </section>

      {/* Complete */}
      <section className="mt-6 pb-8">
        {checklistComplete && job.status === "active" ? (
          <TvButton className={`${showCompleteBanner ? "animate-pulse" : ""}`} variant="primary" onClick={() => {
            if (window.confirm("Mark this load as complete? It will move to your completed loads history.")) confirmComplete();
          }}>
            <Check className="size-5" strokeWidth={2} /> Mark Load as Complete
          </TvButton>
        ) : job.status === "awaiting_payment" ? (
          <TvButton onClick={async () => {
            await updateJob({ status: "paid", payment_received: true, payment_received_date: new Date().toISOString().slice(0, 10) });
            triggerHaptic("medium");
          }}>Mark as Paid</TvButton>
        ) : (
          <>
            <TvButton disabled>Complete Checklist to Finish</TvButton>
            {missing.length > 0 ? (
              <p className="mt-2 text-[14px] text-[var(--color-danger-text)]">Missing: {missing.join(", ")}</p>
            ) : null}
          </>
        )}
      </section>

      {/* Modals & sheets */}
      <BottomSheet open={Boolean(uploadType)} onClose={() => setUploadType(null)} ariaLabel="Upload document">
        <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" id="doc-upload" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
        <div className="space-y-2">
          <label htmlFor="doc-upload" className="flex h-16 cursor-pointer items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4">
            <AlertCircle className="size-6 text-[var(--color-accent)]" strokeWidth={2} /> Take a Photo
          </label>
          <label className="flex h-16 cursor-pointer items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4">
            <FileText className="size-6 text-[var(--color-accent)]" strokeWidth={2} /> Choose from Gallery
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
          </label>
          <button type="button" onClick={() => setUploadType(null)} className="w-full py-3 text-center text-[var(--color-text-muted)]">Cancel</button>
        </div>
      </BottomSheet>

      {qualityIssue && pendingFile ? (
        <BottomSheet open={qualityIssue} onClose={() => setQualityIssue(false)} title="Photo Quality Issue" ariaLabel="Photo quality">
          <AlertCircle className="mx-auto size-8 text-[var(--color-danger)]" strokeWidth={2} />
          <p className="mt-4 text-center text-[var(--color-text-secondary)]">
            A clearer photo helps us fill in your details automatically.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <TvButton onClick={() => { setQualityIssue(false); setUploadType(null); }}>Retake Photo</TvButton>
            <TvButton variant="secondary" onClick={async () => {
              if (!uploadType || !pendingFile || !user) return;
              await uploadJobDocument(createClient(), { userId: user.id, jobId, documentType: uploadType as RequiredDocType, file: pendingFile, skipQualityCheck: true });
              setQualityIssue(false);
              setPendingFile(null);
              setUploadType(null);
              await refresh();
            }}>Upload Anyway</TvButton>
          </div>
        </BottomSheet>
      ) : null}

      <BottomSheet open={paymentSheetOpen} onClose={() => setPaymentSheetOpen(false)} title="Payment Setup" ariaLabel="Payment setup">
        <p className="text-[15px] text-[var(--color-text-secondary)]">When do you expect payment?</p>
        <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
          {job.payment_type === "factoring"
            ? "Factoring companies typically pay within 24-48 hours."
            : "Standard broker terms are net-30. Adjust if you know their schedule."}
        </p>
        <TvInput label="Payment due date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-4" />
        <TvButton className="mt-4" onClick={finalizePayment}>Set Payment Due Date</TvButton>
      </BottomSheet>

      {milestone ? (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[var(--color-overlay)] px-6 text-center">
          <Trophy className="size-20 text-[var(--color-accent)]" strokeWidth={2} />
          <h2 className="mt-4 text-[24px] font-bold">{milestone.title}</h2>
          <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">{milestone.subtitle}</p>
          <TvButton className="mt-8" onClick={() => setMilestone(null)}>Keep going</TvButton>
        </div>
      ) : null}

      {showReferral ? (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[var(--color-overlay)] px-6 text-center">
          <h2 className="text-[20px] font-bold">Know another driver who needs this?</h2>
          <p className="mt-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-3 text-[18px] font-bold text-[var(--color-accent)]">
            {profile?.referral_code ?? "TVT-XXX-0000"}
          </p>
          <TvButton className="mt-4" onClick={() => { setShowReferral(false); setShowUpgrade(true); }}>Share</TvButton>
          <button type="button" className="mt-4 text-[14px] text-[var(--color-text-muted)]" onClick={() => { setShowReferral(false); setShowUpgrade(true); }}>Maybe later</button>
        </div>
      ) : null}

      {showUpgrade ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--color-bg)] px-4 py-8">
          <h2 className="text-[20px] font-medium">Your first load is in the books.</h2>
          <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p>Total earned: {formatCurrency(job.load_value ?? 0)}</p>
            <p>1 load documented</p>
            <p>1 invoice generated</p>
            <p>Estimated time saved: ~35 minutes of paperwork</p>
          </div>
          <h3 className="mt-6 text-[20px] font-medium">Keep building with T-Vault Pro</h3>
          <p className="mt-2 text-[36px] font-bold text-[var(--color-accent)]">$9.99/month · Cancel anytime</p>
          <TvButton className="mt-4">Start Pro — $9.99/month</TvButton>
          <button type="button" className="mt-4 w-full text-center text-[14px] text-[var(--color-text-muted)]" onClick={() => { setShowUpgrade(false); setShowEarnedBanner(true); triggerHaptic("strong"); }}>Maybe later — keep 1 load</button>
        </div>
      ) : null}

      {detentionResult ? (
        <BottomSheet open={Boolean(detentionResult)} onClose={() => setDetentionResult(null)} title="Detention Result" ariaLabel="Detention result">
          <p className="text-[18px] font-bold">Total time: {formatDuration(detentionResult.minutes)}</p>
          {isDetentionBillable(detentionResult.minutes) ? (
            <>
              <DollarSign className="mx-auto mt-4 size-8 text-[var(--color-accent)]" strokeWidth={2} />
              <p className="mt-2 text-center font-medium">You may be owed detention pay</p>
              <p className="mt-2 text-center text-[var(--color-accent)]">
                Est. {formatCurrencyDetailed(calculateDetentionOwed(detentionResult.minutes, getDetentionRate()))} owed beyond the free 2 hours
              </p>
              <TvButton className="mt-4" onClick={async () => {
                const blob = await generateDetentionInvoicePdf({
                  job,
                  profile,
                  totalMinutes: detentionResult.minutes,
                  billableMinutes: Math.max(0, detentionResult.minutes - DETENTION_FREE_MINUTES),
                  hourlyRate: getDetentionRate(),
                  amountOwed: calculateDetentionOwed(detentionResult.minutes, getDetentionRate()),
                });
                const url = await saveDocumentFromBlob(createClient(), {
                  userId: user!.id,
                  jobId,
                  documentType: "detention_invoice",
                  blob,
                  fileName: "detention-invoice.pdf",
                });
                window.open(url, "_blank");
                await saveDetentionOutcome("waiting");
              }}>Generate Detention Invoice</TvButton>
              <TvButton variant="secondary" className="mt-2" onClick={() => saveDetentionOutcome("yes")}>Broker Paid Cash</TvButton>
              <button type="button" className="mt-4 w-full text-[14px] text-[var(--color-text-muted)]" onClick={() => saveDetentionOutcome("waiting")}>Skip — Not Worth It</button>
            </>
          ) : (
            <>
              <p className="mt-2 text-[var(--color-text-secondary)]">Under 2 hours — typically no detention pay owed. Worth documenting anyway.</p>
              <TvButton className="mt-4" onClick={() => saveDetentionOutcome("waiting")}>Save Documentation</TvButton>
              <button type="button" className="mt-2 w-full text-[14px] text-[var(--color-text-muted)]" onClick={() => setDetentionResult(null)}>Discard</button>
            </>
          )}
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <p className="text-[15px] font-medium">Did the broker pay detention?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button type="button" className="h-12 rounded-[var(--radius-input)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]" onClick={() => saveDetentionOutcome("yes")}>Yes</button>
              <button type="button" className="h-12 rounded-[var(--radius-input)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]" onClick={() => saveDetentionOutcome("no")}>No</button>
              <button type="button" className="h-12 rounded-[var(--radius-input)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" onClick={() => saveDetentionOutcome("waiting")}>Waiting</button>
            </div>
          </div>
        </BottomSheet>
      ) : null}

      <BottomSheet open={expenseSheetOpen} onClose={() => setExpenseSheetOpen(false)} title="Add Expense" ariaLabel="Add expense">
        <div className="grid grid-cols-2 gap-2">
          {JOB_EXPENSE_CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setExpenseForm((f) => ({ ...f, category: cat.id }))} className={`flex h-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border ${expenseForm.category === cat.id ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-[var(--color-border)]"}`}>
              <cat.icon className="size-6" strokeWidth={2} />
              <span className="text-[13px]">{cat.label}</span>
            </button>
          ))}
        </div>
        <TvInput label="Amount" inputMode="decimal" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))} className="mt-4" />
        <TvInput label="Date" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} className="mt-4" />
        <TvButton className="mt-4" onClick={async () => {
          if (!user) return;
          await createClient().from("expenses").insert({
            user_id: user.id,
            job_id: jobId,
            category: expenseForm.category,
            amount: Number(expenseForm.amount),
            expense_date: expenseForm.date,
            description: expenseForm.description || null,
          });
          triggerHaptic("medium");
          setExpenseSheetOpen(false);
          await refresh();
        }}>Save Expense</TvButton>
      </BottomSheet>

      <BottomSheet open={Boolean(editField)} onClose={() => setEditField(null)} title="Edit Field" ariaLabel="Edit field">
        <TvInput label={editField ?? ""} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
        <TvButton className="mt-4" onClick={async () => {
          if (!editField) return;
          await updateJob({ [editField]: editValue } as Partial<typeof job>);
          setEditField(null);
        }}>Save</TvButton>
      </BottomSheet>
    </>
  );
}

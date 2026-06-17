"use client";

import { useEffect, useRef, useState } from "react";
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
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  PenLine,
  Plus,
  Receipt,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import type { UserProfile } from "@/types/database";
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
  hasDocumentFile,
  isDocumentChecklistComplete,
  isChecklistComplete,
  isManualDocumentEntry,
  missingChecklistItems,
} from "@/lib/job-folder/documents";
import {
  calculateDetentionOwed,
  formatDuration,
  formatTimerDisplay,
  getDetentionElapsedSeconds,
  isDetentionBillable,
  DETENTION_FREE_MINUTES,
} from "@/lib/job-folder/detention";
import { generateDetentionInvoicePdf } from "@/lib/job-folder/detention-invoice";
import { generateAndSaveLoadInvoice } from "@/lib/job-folder/invoice";
import { uploadJobDocument, saveDocumentFromBlob } from "@/lib/job-folder/upload";
import {
  isDocumentParsing,
  needsAiReview,
  retryDocumentParsing,
  triggerDocumentParsing,
} from "@/lib/job-folder/ai-parsing";
import { isParseableDocType } from "@/lib/job-folder/ai-types";
import {
  resolveCrossValidationConflict,
} from "@/lib/job-folder/cross-validation";
import { AiParsingBanner } from "@/components/job-folder/ai-parsing-banner";
import { AiReviewSheet } from "@/components/job-folder/ai-review-sheet";
import { CrossValidationBanner } from "@/components/job-folder/cross-validation-banner";
import { DocumentManualEntrySheet } from "@/components/job-folder/document-manual-entry-sheet";
import { DocumentPreviewModal } from "@/components/job-folder/document-preview-modal";
import { BrokerRatingPrompt } from "@/components/broker-history/broker-rating-prompt";
import { markJobAsPaid as markJobPaidInDb } from "@/lib/loads/mark-paid";
import { JobFolderFieldInput } from "@/components/job-folder/job-folder-field-input";
import { saveManualDocumentEntryAndVerify } from "@/lib/job-folder/manual-document-save";
import {
  fieldKeyToLabel,
  toEditFieldValue,
} from "@/lib/job-folder/field-labels";
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
import { updateJobProfitability } from "@/lib/job-folder/profitability";
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
import type { CrossValidationConflict } from "@/lib/job-folder/ai-types";

const badgeToneClasses = {
  high: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success)]/10",
  medium: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning)]/10",
  low: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger)]/10",
  unread: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger)]/10",
};

function TrustBadge({
  confidence,
  onManualEntry,
}: {
  confidence: AiConfidence | null;
  onManualEntry?: () => void;
}) {
  if (confidence === "manual") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-shell-border)] bg-[var(--color-surface)] px-2 py-0.5 tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
        <PenLine className="size-3.5" strokeWidth={2} aria-hidden />
        Added Manually
      </span>
    );
  }

  if (!confidence || confidence === "low" || confidence === "unread") {
    const badge = (
      <>
        <AlertTriangle className="size-3.5" strokeWidth={2} />
        Enter manually
      </>
    );
    if (onManualEntry) {
      return (
        <button
          type="button"
          onClick={onManualEntry}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-opacity active:opacity-80 ${badgeToneClasses.low}`}
        >
          {badge}
        </button>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.low}`}>
        {badge}
      </span>
    );
  }
  if (confidence === "medium") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.medium}`}>
        <AlertTriangle className="size-3.5" strokeWidth={2} />
        AI — please check
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.high}`}>
      <Bot className="size-3.5" strokeWidth={2} />
      AI verified
    </span>
  );
}

function fieldConfidence(
  documents: JobDocument[],
  type: RequiredDocType
): AiConfidence | null {
  const doc = getDocument(documents, type);
  if (!doc) return null;
  if (isManualDocumentEntry(doc)) return "manual";
  return doc.ai_confidence ?? null;
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
    setJob,
    setDocuments,
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
  const [aiBanner, setAiBanner] = useState<"rate_limited" | "parse_failed" | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [failedParseDoc, setFailedParseDoc] = useState<{
    documentId: string;
    documentType: string;
  } | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const [previewDocument, setPreviewDocument] = useState<JobDocument | null>(null);
  const [manualEntryDocType, setManualEntryDocType] = useState<string | null>(null);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [paymentStatusSheetOpen, setPaymentStatusSheetOpen] = useState(false);
  const [undoPaidConfirmOpen, setUndoPaidConfirmOpen] = useState(false);
  const [ratingPromptOpen, setRatingPromptOpen] = useState(false);
  const [ratingPromptJob, setRatingPromptJob] = useState<typeof job>(null);

  const openEditField = (key: string, rawValue: unknown) => {
    setEditField(key);
    setEditValue(toEditFieldValue(key, rawValue));
  };

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
    if (!activeSession?.timer_start) {
      setTimerSeconds(0);
      return;
    }
    const tick = () =>
      setTimerSeconds(getDetentionElapsedSeconds(activeSession.timer_start));
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

  useEffect(() => {
    if (!job || job.ai_fields_confirmed) return;
    if (needsAiReview(job, documents)) {
      setReviewOpen(true);
    }
  }, [job, documents]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, []);

  const runDocumentParsing = async (
    documentId: string,
    documentType: string,
    poorQuality = false
  ) => {
    if (!user || !isParseableDocType(documentType)) return;
    const supabase = createClient();
    const result = await triggerDocumentParsing(supabase, {
      documentId,
      documentType,
      jobId,
      userId: user.id,
      documents,
      profile,
      poorQuality,
    });
    await refresh();

    if (result.status === "rate_limited") {
      setAiBanner("rate_limited");
      return;
    }

    if (result.status === "failed" && result.retryable) {
      setAiBanner("parse_failed");
      setFailedParseDoc({ documentId, documentType });
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(async () => {
        const retryResult = await retryDocumentParsing(supabase, {
          documentId,
          documentType,
          jobId,
          userId: user.id,
          documents,
          profile,
        });
        await refresh();
        if (retryResult.status === "complete") {
          setAiBanner(null);
          setFailedParseDoc(null);
        }
      }, 60_000);
      return;
    }

    if (result.status === "complete") {
      setAiBanner(null);
      setFailedParseDoc(null);
    }
  };

  const handleCrossValidationResolve = async (
    conflict: CrossValidationConflict,
    source: "rate_con" | "bol"
  ) => {
    const updates = resolveCrossValidationConflict(conflict, source);
    const remaining =
      (job?.cross_validation_conflicts ?? []).filter(
        (c) => c.field !== conflict.field
      );
    await updateJob({
      ...updates,
      cross_validation_conflicts: remaining.length ? remaining : null,
    });
    await refresh();
  };

  if (loading) {
    return (
      <div className="px-5 pt-6">
        <div className="tv-skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="px-5 pt-6">
        <div className="tv-error-state">
          <p className="text-[15px]">{error ?? "Load not found."}</p>
        </div>
      </div>
    );
  }

  const { complete, total } = countRequiredDocs(documents);
  const optionalCount = countOptionalDocs(documents);
  const hasLumperExpense = expenses.some((e) => e.category === "lumper");
  const checklistComplete = isChecklistComplete(documents);
  const missing = missingChecklistItems(documents);
  const hasInvoice =
    hasDocument(documents, "invoice") ||
    Boolean(job.invoice_generated || job.invoice_url);
  const isPaid = job.status === "paid" || Boolean(job.payment_received);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const estMiles = estimateMiles(job.pickup_location, job.delivery_location);

  const runInvoiceGeneration = async (regenerate: boolean) => {
    if (!user) return;
    if (needsAiReview(job, documents)) {
      setReviewOpen(true);
      return;
    }
    setUploading(true);
    try {
      await generateAndSaveLoadInvoice(createClient(), {
        job,
        profile,
        userId: user.id,
        documents,
        regenerate,
      });
      await refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "ai_review_required") {
        setReviewOpen(true);
      } else if (err instanceof Error && err.message === "no_invoice_to_regenerate") {
        window.alert("No invoice exists yet to regenerate.");
      } else {
        window.alert(
          regenerate
            ? "Could not regenerate invoice. Try again."
            : "Could not generate invoice. Try again."
        );
      }
    } finally {
      setUploading(false);
      setRegenerateConfirmOpen(false);
    }
  };

  const markJobAsPaid = async () => {
    if (!user || !job) return;
    const supabase = createClient();
    const { job: updated } = await markJobPaidInDb(supabase, user.id, job.id);
    if (!updated) {
      window.alert("Could not mark this load as paid. Try again.");
      return;
    }
    triggerHaptic("medium");
    setPaymentStatusSheetOpen(false);
    await refresh();

    if (updated && updated.broker_name?.trim() && !updated.broker_rating) {
      setRatingPromptJob(updated);
      setRatingPromptOpen(true);
    }
  };

  const markJobAsUnpaid = async () => {
    await updateJob({
      status: "awaiting_payment",
      payment_received: false,
      payment_received_date: null,
    });
    triggerHaptic("medium");
    setPaymentStatusSheetOpen(false);
    setUndoPaidConfirmOpen(false);
    await refresh();
  };

  const markJobAwaitingPayment = async () => {
    await updateJob({
      status: "awaiting_payment",
      payment_received: false,
      payment_received_date: null,
    });
    triggerHaptic("medium");
    setPaymentStatusSheetOpen(false);
    await refresh();
  };

  const renderEditPencil = (
    fieldKey: string,
    value: unknown,
    label: string
  ) => (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      onClick={() => openEditField(fieldKey, value)}
      className="shrink-0 text-[var(--color-accent)]"
    >
      <Pencil className="size-6" strokeWidth={2} />
    </button>
  );

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
    const elapsedSeconds = getDetentionElapsedSeconds(activeSession.timer_start);
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const supabase = createClient();
    const { data } = await supabase
      .from("detention_sessions")
      .update({
        timer_end: end.toISOString(),
        total_minutes: minutes,
        amount_owed: calculateDetentionOwed(minutes, getDetentionRate()),
      })
      .eq("id", activeSession.id)
      .eq("user_id", user.id)
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
      .eq("id", detentionResult.sessionId)
      .eq("user_id", user.id);
    await updateBrokerDetentionOutcome(supabase, user.id, job.broker_name, paid);
    await updateJob({ detention_paid: paid });
    setDetentionResult(null);
    await refresh();
  };

  const handleFileSelect = async (file: File, poorQuality = false) => {
    if (!uploadType || !user || uploading) return;
    const docType = uploadType;
    setPendingFile(file);
    setUploading(true);
    try {
      const { documentId } = await uploadJobDocument(createClient(), {
        userId: user.id,
        jobId,
        documentType: docType as RequiredDocType,
        file,
        skipQualityCheck: poorQuality,
      });
      await refresh();
      setUploadType(null);
      setPendingFile(null);
      await runDocumentParsing(documentId, docType, poorQuality);
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
    } finally {
      setUploading(false);
    }
  };

  const confirmComplete = async () => {
    if (!user || !checklistComplete || job.status !== "active") return;
    const supabase = createClient();
    const { error } = await supabase
      .from("jobs")
      .update({ status: "awaiting_payment", updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("user_id", user.id);
    if (error) {
      window.alert("Could not update load status. Try again.");
      return;
    }
    await updateStreak(supabase, user.id);
    await refreshProfile();
    setPaymentSheetOpen(true);
    await refresh();
  };

  const finalizePayment = async () => {
    if (!user || !job) return;
    const supabase = createClient();

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingPayment) {
      const { error: paymentError } = await supabase.from("payments").insert({
        user_id: user.id,
        job_id: jobId,
        amount: job.load_value,
        payment_type: job.payment_type,
        expected_date: paymentDate,
        status: "pending",
      });

      if (paymentError) {
        window.alert("Could not save payment details. Try again.");
        return;
      }

      await updateUserStatsOnComplete(
        supabase,
        user.id,
        job.load_value ?? 0
      );
    }

    const { error: jobError } = await supabase
      .from("jobs")
      .update({ payment_expected_date: paymentDate })
      .eq("id", jobId)
      .eq("user_id", user.id);

    if (jobError) {
      window.alert("Could not save payment details. Try again.");
      return;
    }

    await refreshProfile();

    const { data: updatedProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const achieved = await fetchAchievedMilestones(supabase, user.id);
    const monthEarnings = updatedProfile?.best_month_earnings ?? 0;
    const newMilestones = updatedProfile
      ? detectNewMilestones(updatedProfile as UserProfile, monthEarnings, achieved)
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
      <header className="sticky top-[4.5rem] z-40 border-b border-[var(--color-shell-border)] bg-[var(--color-bg)]/95 px-5 pb-3 pt-2 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Link
            href={APP_ROUTES.loads}
            onClick={saveLoadsScrollPosition}
            aria-label="Back to My Loads"
            className="flex size-11 shrink-0 items-center justify-center text-[var(--color-accent)]"
          >
            <ChevronLeft className="size-7" strokeWidth={2} />
          </Link>
          <h1 className="flex-1 truncate tv-section-header">
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
              <div className="absolute right-0 z-10 mt-1 min-w-44 tv-glass-card rounded-xl py-1">
                {[
                  { label: "Edit Job Name", action: () => openEditField("job_name", job.job_name) },
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
                  { label: "Mark as Complete", action: confirmComplete, hidden: !checklistComplete || job.status !== "active" },
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
                      if (!user) return;
                      await createClient().from("jobs").delete().eq("id", jobId).eq("user_id", user.id);
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
        <button
          type="button"
          onClick={() => setPaymentStatusSheetOpen(true)}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 ${statusBanner.bg}`}
        >
          {StatusIcon ? <StatusIcon className="size-5 text-[var(--color-success-text)]" strokeWidth={2} /> : null}
          <span className="text-[15px] font-medium">{statusBanner.text}</span>
        </button>
      </header>

      <div className="px-5">
      {showCompleteBanner ? (
        <div className="mt-3 animate-pulse rounded-2xl bg-[var(--color-success-bg)] px-4 py-3 text-center text-[15px] text-[var(--color-success-text)]">
          Required documents complete!
        </div>
      ) : null}

      {aiBanner ? (
        <AiParsingBanner
          type={aiBanner}
          onDismiss={() => setAiBanner(null)}
          onRetry={
            failedParseDoc
              ? async () => {
                  if (!user || !failedParseDoc) return;
                  await retryDocumentParsing(createClient(), {
                    documentId: failedParseDoc.documentId,
                    documentType: failedParseDoc.documentType,
                    jobId,
                    userId: user.id,
                    documents,
                    profile,
                  });
                  await refresh();
                }
              : undefined
          }
        />
      ) : null}

      {job.cross_validation_conflicts?.length ? (
        <CrossValidationBanner
          conflicts={job.cross_validation_conflicts}
          onResolve={handleCrossValidationResolve}
        />
      ) : null}

      {!job.ai_fields_confirmed && needsAiReview(job, documents) ? (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-warning-bg)] px-4 py-3 text-[14px] text-[var(--color-warning-text)]"
        >
          <Bot className="size-4 text-[var(--color-accent)]" strokeWidth={2} />
          Review AI details before invoicing
        </button>
      ) : null}

      {showEarnedBanner ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl tv-brushed-gold-btn px-4 py-3 text-[15px] font-bold text-[var(--color-on-accent)]">
          <DollarSign className="size-5" strokeWidth={2} />
          Load Complete — {formatCurrency(job.load_value ?? 0)} earned
        </div>
      ) : null}

      {/* Job Details */}
      <section className="mt-4 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] p-5">
        <div className="space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="tv-label">Broker Name</p>
                <div className="flex items-center gap-2">
                  <p className="text-[17px] font-bold">{job.broker_name || "Tap to add"}</p>
                  {brokerBadge ? (
                    <button
                      type="button"
                      onClick={() => setBrokerSheetOpen(true)}
                      className={`rounded-full px-2 py-0.5 text-[12px] ${
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
              {renderEditPencil("broker_name", job.broker_name, "Broker Name")}
            </div>
          </div>
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="tv-label">Load Value</p>
                <p className="tv-tabular text-[24px] font-bold text-[var(--color-accent)]">
                  {job.load_value ? formatCurrencyDetailed(job.load_value) : "Tap to add"}
                </p>
              </div>
              {renderEditPencil("load_value", job.load_value, "Load Value")}
            </div>
          </div>
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="tv-label">Route</p>
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
              <div className="flex shrink-0 gap-1">
                {renderEditPencil("pickup_location", job.pickup_location, "Pickup Location")}
                {renderEditPencil("delivery_location", job.delivery_location, "Delivery Location")}
              </div>
            </div>
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
            {(
              [
                "pickup_date",
                "delivery_date",
                "miles",
                "payment_type",
                "notes",
              ] as const
            ).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="tv-label">{fieldKeyToLabel(key)}</p>
                  <p className="text-[17px] font-bold">
                    {(job[key as keyof typeof job] as string | number | null)?.toString() || "Tap to add"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${fieldKeyToLabel(key)}`}
                  onClick={() => openEditField(key, job[key as keyof typeof job])}
                  className="shrink-0 text-[var(--color-accent)]"
                >
                  <Pencil className="size-6" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="mt-6">
        <h2 className="tv-section-header">Documents</h2>
        <p className={`mt-1 text-[14px] ${complete === total ? "text-[var(--color-success-text)]" : "text-[var(--color-text-secondary)]"}`}>
          {complete} of {total} required docs uploaded
        </p>
        <p className="text-[13px] text-[var(--color-text-muted)]">{optionalCount} optional docs added</p>
        <div className="tv-progress-track mt-2">
          <div className="tv-progress-fill" style={{ width: `${(complete / total) * 100}%` }} />
        </div>
        <div className="mt-4 space-y-2">
          {REQUIRED_DOC_TYPES.map((type) => {
            const doc = getDocument(documents, type);
            const checklistComplete = isDocumentChecklistComplete(documents, type);
            const hasFile = hasDocumentFile(documents, type);
            const parsing = isDocumentParsing(doc);
            return (
              <div key={type} className="flex min-h-16 items-center gap-3 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] px-4">
                <span className={`size-3 shrink-0 rounded-full ${checklistComplete ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{DOC_TYPE_LABELS[type]}</p>
                    {parsing ? (
                      <Loader2
                        className="size-4 animate-spin text-[var(--color-accent)]"
                        strokeWidth={2}
                        aria-label="Parsing document"
                      />
                    ) : null}
                  </div>
                  {!checklistComplete ? (
                    <p className="text-[13px] text-[var(--color-text-muted)]">Tap to upload</p>
                  ) : null}
                  <TrustBadge
                    confidence={fieldConfidence(documents, type)}
                    onManualEntry={
                      doc && isManualDocumentEntry(doc)
                        ? undefined
                        : () => setManualEntryDocType(type)
                    }
                  />
                </div>
                {checklistComplete ? (
                  <button
                    type="button"
                    className="tv-outline-btn"
                    onClick={() => {
                      if (hasFile && doc) {
                        setPreviewDocument(doc);
                        return;
                      }
                      setManualEntryDocType(type);
                    }}
                  >
                    View
                  </button>
                ) : (
                  <button type="button" aria-label="Upload document" className="tv-accent-outline-btn" onClick={() => setUploadType(type)}>Upload</button>
                )}
              </div>
            );
          })}
          <div className="flex min-h-16 items-center gap-3 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] px-4">
            <span className={`size-3 shrink-0 rounded-full ${hasInvoice ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
            <p className="flex-1 font-medium">Invoice</p>
            {hasInvoice ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="tv-outline-btn"
                  onClick={() => {
                    const doc = getDocument(documents, "invoice");
                    if (doc) setPreviewDocument(doc);
                  }}
                >
                  View
                </button>
                <button
                  type="button"
                  className="tv-brushed-gold-btn h-11 rounded-xl px-3 text-[14px] font-bold text-[var(--color-on-accent)]"
                  disabled={uploading}
                  onClick={() => setRegenerateConfirmOpen(true)}
                >
                  {uploading ? "..." : "Regenerate Invoice"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="tv-brushed-gold-btn h-11 rounded-xl px-3 text-[14px] font-bold text-[var(--color-on-accent)]"
                disabled={uploading}
                onClick={() => runInvoiceGeneration(false)}
              >
                {uploading ? "..." : "Generate Invoice"}
              </button>
            )}
          </div>
          {hasInvoice || job.status === "awaiting_payment" || isPaid ? (
            <div className="rounded-2xl tv-glass-card border border-[var(--color-shell-border)] px-4 py-3">
              {isPaid ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[var(--color-success-text)]">
                    <Check className="size-5" strokeWidth={2} />
                    <span className="text-[15px] font-bold">Paid ✓</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUndoPaidConfirmOpen(true)}
                    className="text-[14px] text-[var(--color-text-muted)] underline-offset-2 hover:underline"
                  >
                    Undo
                  </button>
                </div>
              ) : (
                <TvButton onClick={markJobAsPaid}>
                  <DollarSign className="size-5" strokeWidth={2} />
                  Mark as Paid
                </TvButton>
              )}
            </div>
          ) : null}
          {hasLumperExpense ? (
            <div className="tv-divider mt-4 pt-4 space-y-2">
              {(["fuel_receipt", "lumper_receipt"] as const).map((type) => (
                <div key={type} className="flex min-h-16 items-center gap-3 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] px-4">
                  <span className={`size-3 shrink-0 rounded-full ${hasDocument(documents, type) ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                  <p className="flex-1 font-medium">{DOC_TYPE_LABELS[type]}</p>
                  <button type="button" className="tv-accent-outline-btn" onClick={() => setUploadType(type)}>Upload</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Detention */}
      <section className="mt-6">
        <h2 className="tv-section-header">Detention</h2>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Brokers owe you after 2 hours of waiting. Document it — it&apos;s your money.
        </p>
        {activeSession ? (
          <div className="mt-4 rounded-2xl tv-glass-card border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] p-5 text-center">
            <Clock className="mx-auto size-7 animate-spin text-[var(--color-success)]" style={{ animationDuration: "4s" }} strokeWidth={2} />
            <p className="tv-tabular mt-3 text-[40px] font-bold">{formatTimerDisplay(timerSeconds)}</p>
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
            <button type="button" onClick={() => startDetention("pickup")} className="tv-glass-card flex h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--color-success)]/20 text-[15px] text-[var(--color-success-text)]">
              <Clock className="size-5" strokeWidth={2} /> At Pickup
            </button>
            <button type="button" onClick={() => startDetention("delivery")} className="tv-glass-card flex h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--color-success)]/20 text-[15px] text-[var(--color-success-text)]">
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
          <h2 className="tv-section-header">Load Expenses</h2>
          <div className="flex items-center gap-2">
            <span className="tv-tabular font-bold text-[var(--color-accent)]">{formatCurrencyDetailed(expenseTotal)}</span>
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
            <div key={exp.id} className="flex min-h-16 items-center gap-3 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] px-4">
              <Receipt className="size-6 text-[var(--color-accent)]" strokeWidth={2} />
              <div className="flex-1">
                <p className="font-medium capitalize">{exp.category}</p>
                <p className="text-[13px] text-[var(--color-text-muted)]">{exp.description || "—"}</p>
              </div>
              <p className="tv-tabular font-bold text-[var(--color-danger-text)]">{formatCurrencyDetailed(exp.amount)}</p>
              {exp.receipt_url ? <FileText className="size-5 text-[var(--color-success-text)]" strokeWidth={2} /> : <AlertCircle className="size-5 text-[var(--color-warning-text)]" strokeWidth={2} />}
            </div>
          ))}
        </div>
      </section>

      {/* Complete */}
      <section className="mt-6 pb-8">
        {checklistComplete && job.status === "active" ? (
          <TvButton
            className={`bg-[var(--color-success)] text-[var(--color-success-text)] ${showCompleteBanner ? "animate-pulse" : ""}`}
            onClick={() => {
              if (
                window.confirm(
                  "Mark this load as complete? It will move to Awaiting Payment until you record payment."
                )
              ) {
                confirmComplete();
              }
            }}
          >
            <Check className="size-5" strokeWidth={2} /> Mark as Complete
          </TvButton>
        ) : !checklistComplete && job.status === "active" ? (
          <>
            <TvButton disabled>Complete Checklist to Finish</TvButton>
            {missing.length > 0 ? (
              <p className="mt-2 text-[14px] text-[var(--color-danger-text)]">
                Missing: {missing.join(", ")}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {/* Modals & sheets */}
      <BottomSheet open={Boolean(uploadType)} onClose={() => setUploadType(null)} ariaLabel="Upload document">
        <input type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" className="hidden" id="doc-upload" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
        <div className="space-y-2">
          <label htmlFor="doc-upload" className="flex h-16 cursor-pointer items-center gap-3 rounded-2xl tv-glass-card px-4">
            <AlertCircle className="size-6 text-[var(--color-accent)]" strokeWidth={2} /> Take a Photo
          </label>
          <label className="flex h-16 cursor-pointer items-center gap-3 rounded-2xl tv-glass-card px-4">
            <FileText className="size-6 text-[var(--color-accent)]" strokeWidth={2} /> Choose from Gallery
            <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
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
              const docType = uploadType;
              const { documentId } = await uploadJobDocument(createClient(), { userId: user.id, jobId, documentType: docType as RequiredDocType, file: pendingFile, skipQualityCheck: true });
              setQualityIssue(false);
              setPendingFile(null);
              setUploadType(null);
              await refresh();
              await runDocumentParsing(documentId, docType, true);
            }}>Upload Anyway</TvButton>
          </div>
        </BottomSheet>
      ) : null}

      <BottomSheet
        open={regenerateConfirmOpen}
        onClose={() => setRegenerateConfirmOpen(false)}
        title="Regenerate Invoice?"
        ariaLabel="Confirm invoice regeneration"
      >
        <p className="text-[15px] text-[var(--color-text-secondary)]">
          This will replace your existing invoice. Make sure you haven&apos;t already sent the old one.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <TvButton disabled={uploading} onClick={() => runInvoiceGeneration(true)}>
            Confirm
          </TvButton>
          <TvButton variant="ghost" disabled={uploading} onClick={() => setRegenerateConfirmOpen(false)}>
            Cancel
          </TvButton>
        </div>
      </BottomSheet>

      <BottomSheet
        open={paymentStatusSheetOpen}
        onClose={() => setPaymentStatusSheetOpen(false)}
        title="Payment Status"
        ariaLabel="Update payment status"
      >
        <div className="flex flex-col gap-2">
          {isPaid ? (
            <TvButton variant="secondary" onClick={markJobAsUnpaid}>
              Mark as Unpaid
            </TvButton>
          ) : (
            <TvButton onClick={markJobAsPaid}>
              <DollarSign className="size-5" strokeWidth={2} />
              Mark as Paid
            </TvButton>
          )}
          {job.status !== "awaiting_payment" || isPaid ? (
            <TvButton variant="secondary" onClick={markJobAwaitingPayment}>
              Awaiting Payment
            </TvButton>
          ) : null}
          <TvButton variant="ghost" onClick={() => setPaymentStatusSheetOpen(false)}>
            Cancel
          </TvButton>
        </div>
      </BottomSheet>

      <BottomSheet
        open={undoPaidConfirmOpen}
        onClose={() => setUndoPaidConfirmOpen(false)}
        title="Mark as Unpaid?"
        ariaLabel="Confirm marking load as unpaid"
      >
        <p className="text-[15px] text-[var(--color-text-secondary)]">
          Mark this load as unpaid?
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <TvButton onClick={markJobAsUnpaid}>Confirm</TvButton>
          <TvButton variant="ghost" onClick={() => setUndoPaidConfirmOpen(false)}>
            Cancel
          </TvButton>
        </div>
      </BottomSheet>

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
        <div className="fixed inset-0 z-[80] tv-modal-overlay">
          <div className="tv-modal-panel">
          <Trophy className="mx-auto size-20 text-[var(--color-accent)]" strokeWidth={2} />
          <h2 className="mt-4 text-[24px] font-bold">{milestone.title}</h2>
          <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">{milestone.subtitle}</p>
          <TvButton className="mt-8" onClick={() => setMilestone(null)}>Keep going</TvButton>
          </div>
        </div>
      ) : null}

      {showReferral ? (
        <div className="fixed inset-0 z-[80] tv-modal-overlay">
          <div className="tv-modal-panel">
          <h2 className="text-[20px] font-bold">Know another driver who needs this?</h2>
          <p className="mt-4 rounded-xl tv-glass-card px-4 py-3 tv-tabular text-[18px] font-bold text-[var(--color-accent)]">
            {profile?.referral_code ?? "TVT-XXX-0000"}
          </p>
          <TvButton
            className="mt-4"
            onClick={async () => {
              const message = `I've been using T-Vault to keep my loads organized. Here's my invite code: ${profile?.referral_code ?? ""} — try it at TVT.app`;
              if (navigator.share) {
                await navigator.share({ text: message });
              } else {
                await navigator.clipboard.writeText(message);
              }
              setShowReferral(false);
              setShowUpgrade(true);
            }}
          >
            Share
          </TvButton>
          <button type="button" className="mt-4 text-[14px] text-[var(--color-text-muted)]" onClick={() => { setShowReferral(false); setShowUpgrade(true); }}>Maybe later</button>
          </div>
        </div>
      ) : null}

      {showUpgrade ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--color-bg)] px-5 py-8">
          <h2 className="tv-section-header">Your first load is in the books.</h2>
          <div className="mt-4 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] p-5">
            <p className="tv-tabular text-[var(--color-accent)]">Total earned: {formatCurrency(job.load_value ?? 0)}</p>
            <p className="mt-2 text-[var(--color-text-secondary)]">1 load documented</p>
            <p className="text-[var(--color-text-secondary)]">1 invoice generated</p>
            <p className="text-[var(--color-text-secondary)]">Estimated time saved: ~35 minutes of paperwork</p>
          </div>
          <h3 className="tv-section-header mt-6">Keep building with T-Vault Pro</h3>
          <p className="tv-tabular mt-2 text-[36px] font-bold text-[var(--color-accent)]">$9.99/month · Cancel anytime</p>
          <TvButton
            className="mt-4"
            onClick={async () => {
              await fetch("/api/pro-waitlist", { method: "POST" });
              setShowUpgrade(false);
              setShowEarnedBanner(true);
              triggerHaptic("strong");
            }}
          >
            Start Pro — $9.99/month
          </TvButton>
          <button
            type="button"
            className="mt-4 w-full text-center text-[14px] text-[var(--color-text-muted)]"
            onClick={async () => {
              const supabase = createClient();
              if (user) {
                await supabase
                  .from("users")
                  .update({ upgrade_dismissed_at: new Date().toISOString() })
                  .eq("id", user.id);
              }
              setShowUpgrade(false);
              setShowEarnedBanner(true);
              triggerHaptic("strong");
            }}
          >
            Maybe later — keep 1 load
          </button>
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
          <div className="tv-divider mt-6 pt-4">
            <p className="text-[15px] font-medium">Did the broker pay detention?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button type="button" className="h-12 rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] text-[var(--color-success-text)]" onClick={() => saveDetentionOutcome("yes")}>Yes</button>
              <button type="button" className="h-12 rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]" onClick={() => saveDetentionOutcome("no")}>No</button>
              <button type="button" className="h-12 rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" onClick={() => saveDetentionOutcome("waiting")}>Waiting</button>
            </div>
          </div>
        </BottomSheet>
      ) : null}

      <BottomSheet open={expenseSheetOpen} onClose={() => setExpenseSheetOpen(false)} title="Add Expense" ariaLabel="Add expense">
        <div className="grid grid-cols-2 gap-2">
          {JOB_EXPENSE_CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setExpenseForm((f) => ({ ...f, category: cat.id }))} className={`tv-chip h-20 ${expenseForm.category === cat.id ? "tv-chip-active" : "tv-chip-inactive"}`}>
              <cat.icon className="size-6" strokeWidth={2} />
              <span className="text-[13px]">{cat.label}</span>
            </button>
          ))}
        </div>
        <TvInput label="Amount" inputMode="decimal" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))} className="mt-4" />
        <TvInput label="Date" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} className="mt-4" />
        <TvButton className="mt-4" onClick={async () => {
          if (!user) return;
          const amount = Number(expenseForm.amount);
          if (!expenseForm.amount.trim() || Number.isNaN(amount) || amount <= 0) {
            window.alert("Enter a valid expense amount.");
            return;
          }
          if (!expenseForm.date) {
            window.alert("Select an expense date.");
            return;
          }
          const { error } = await createClient().from("expenses").insert({
            user_id: user.id,
            job_id: jobId,
            category: expenseForm.category,
            amount,
            expense_date: expenseForm.date,
            description: expenseForm.description || null,
          });
          if (error) {
            window.alert("Could not save expense. Try again.");
            return;
          }
          triggerHaptic("medium");
          setExpenseSheetOpen(false);
          await refresh();
        }}>Save Expense</TvButton>
      </BottomSheet>

      <BottomSheet open={Boolean(editField)} onClose={() => setEditField(null)} title="Edit Field" ariaLabel="Edit field">
        {editField ? (
          <JobFolderFieldInput
            fieldKey={editField}
            value={editValue}
            onChange={setEditValue}
          />
        ) : null}
        <TvButton className="mt-4" onClick={async () => {
          if (!editField || !user) return;
          const updates = { [editField]: editValue } as Partial<typeof job>;
          if (editField === "miles" || editField === "load_value") {
            const num = Number(editValue.replace(/[^0-9.]/g, ""));
            if (!Number.isNaN(num)) {
              (updates as Record<string, unknown>)[editField] = num;
            }
          }
          await updateJob(updates);
          if (editField === "miles" && job) {
            const milesNum = Number(editValue.replace(/[^0-9.]/g, ""));
            await updateJobProfitability(createClient(), {
              id: job.id,
              load_value: job.load_value,
              miles: milesNum || job.miles,
            }, user.id, profile);
            await refresh();
          }
          setEditField(null);
        }}>Save</TvButton>
      </BottomSheet>

      {user ? (
        <AiReviewSheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          job={job}
          documents={documents}
          userId={user.id}
          profile={profile}
          onConfirmed={refresh}
        />
      ) : null}

      <DocumentPreviewModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />

      <DocumentManualEntrySheet
        open={Boolean(manualEntryDocType)}
        onClose={() => setManualEntryDocType(null)}
        documentType={manualEntryDocType}
        job={job}
        documents={documents}
        userId={user?.id ?? ""}
        profile={profile}
        onSave={async (payload) => {
          if (!user || !job) return;

          const { job: savedJob, documents: savedDocuments } =
            await saveManualDocumentEntryAndVerify(createClient(), {
              jobId,
              userId: user.id,
              payload,
            });

          setJob(savedJob);
          setDocuments(savedDocuments);
        }}
      />

      <BrokerRatingPrompt
        job={ratingPromptJob}
        open={ratingPromptOpen}
        onClose={() => {
          setRatingPromptOpen(false);
          setRatingPromptJob(null);
        }}
        onSaved={refresh}
      />
      </div>
    </>
  );
}

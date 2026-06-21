"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvInput } from "@/components/tv/tv-input";
import { TvDateInput } from "@/components/tv/tv-date-input";
import { useNewJobSheet } from "@/components/providers/new-job-provider";
import { useProPaywall } from "@/components/pro/pro-paywall-provider";
import { FieldTrustBadge } from "@/components/job-folder/field-trust-badge";
import { BrokerAutocomplete } from "@/components/brokers/broker-autocomplete";
import { ensureJobBrokerLink } from "@/lib/brokers/link-job-broker";
import { triggerHaptic } from "@/lib/haptics";
import { estimateMiles } from "@/lib/job-folder/mileage";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import { checkImageQuality } from "@/lib/job-folder/image-quality";
import { validateFileType } from "@/lib/job-folder/upload";
import { attachScannedRateCon } from "@/lib/new-load/attach-scanned-rate-con";
import {
  applyRateConParsedToNewLoadForm,
  hasUsableRateConExtraction,
  parseRateConPreview,
  type NewLoadScanFieldKey,
} from "@/lib/new-load/rate-con-scan";
import type { RateConParsedData } from "@/lib/job-folder/ai-types";
import {
  sanitizeText,
  validateTextLength,
  validateLoadValue,
  getTextCounter,
} from "@/lib/validation";
import { TEXT_LIMITS, APP_ROUTES } from "@/lib/constants";
import { canCreateJob, countUserJobs } from "@/lib/pro-tier";
import type { LoadTemplate } from "@/types/job-folder";
import type { AiConfidence, PaymentType } from "@/types/jobs";

interface NewJobForm {
  jobName: string;
  rateConNumber: string;
  bolNumber: string;
  loadValue: string;
  brokerName: string;
  brokerId: string | null;
  brokerVerified: boolean;
  pickupLocation: string;
  pickupFacility: string;
  deliveryLocation: string;
  deliveryFacility: string;
  pickupDate: string;
  deliveryDate: string;
  paymentType: PaymentType;
  factoringCompany: string;
  saveAsTemplate: boolean;
  templateName: string;
  miles: string;
  notes: string;
}

const emptyForm: NewJobForm = {
  jobName: "",
  rateConNumber: "",
  bolNumber: "",
  loadValue: "",
  brokerName: "",
  brokerId: null,
  brokerVerified: false,
  pickupLocation: "",
  pickupFacility: "",
  deliveryLocation: "",
  deliveryFacility: "",
  pickupDate: "",
  deliveryDate: "",
  paymentType: "direct",
  factoringCompany: "",
  saveAsTemplate: false,
  templateName: "",
  miles: "",
  notes: "",
};

function ScanFieldLabel({
  label,
  confidence,
}: {
  label: string;
  confidence?: AiConfidence;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="tv-body font-semibold text-[var(--color-text-primary)]">
        {label}
      </span>
      {confidence ? <FieldTrustBadge confidence={confidence} /> : null}
    </div>
  );
}

export function NewJobSheet() {
  const { open, closeSheet } = useNewJobSheet();
  const { openPaywall } = useProPaywall();
  const { user, profile, hasProAccess } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<NewJobForm>(emptyForm);
  const [templates, setTemplates] = useState<LoadTemplate[]>([]);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [jobCount, setJobCount] = useState(0);

  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [qualityIssue, setQualityIssue] = useState(false);
  const [pendingScanFile, setPendingScanFile] = useState<File | null>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scannedParsedData, setScannedParsedData] =
    useState<RateConParsedData | null>(null);
  const [scannedDocConfidence, setScannedDocConfidence] =
    useState<AiConfidence | null>(null);
  const [fieldConfidences, setFieldConfidences] = useState<
    Partial<Record<NewLoadScanFieldKey, AiConfidence>>
  >({});

  const resetScanState = useCallback(() => {
    setScanning(false);
    setScanMessage(null);
    setQualityIssue(false);
    setPendingScanFile(null);
    setScannedFile(null);
    setScannedParsedData(null);
    setScannedDocConfidence(null);
    setFieldConfidences({});
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, job_name, broker_name, load_value, pickup_location, pickup_facility, delivery_location, delivery_facility, rate_con_number, bol_number, payment_type, factoring_company, miles, notes, template_name"
      )
      .eq("user_id", user.id)
      .eq("is_template", true)
      .order("updated_at", { ascending: false });

    setTemplates((data as LoadTemplate[]) ?? []);
    const count = await countUserJobs(supabase, user.id);
    setJobCount(count);
  }, [user]);

  useEffect(() => {
    if (open) loadTemplates();
    else {
      setForm(emptyForm);
      resetScanState();
    }
  }, [open, loadTemplates, resetScanState]);

  const estimatedMiles =
    form.miles || String(estimateMiles(form.pickupLocation, form.deliveryLocation) ?? "");

  const showProfitPreview =
    form.jobName.trim().length > 0 && form.loadValue.trim().length > 0;

  const costPerMile = (profile as { cost_per_mile?: number | null })?.cost_per_mile;

  const profitabilityEstimate = (() => {
    const loadVal = Number(form.loadValue.replace(/[^0-9.]/g, ""));
    if (!loadVal || Number.isNaN(loadVal)) return null;
    const milesNum =
      Number(estimatedMiles) ||
      estimateMiles(form.pickupLocation, form.deliveryLocation);
    if (costPerMile && milesNum) {
      const cost = costPerMile * milesNum;
      const net = loadVal - cost;
      const perMile = milesNum ? net / milesNum : 0;
      return { net, perMile, milesNum, costPerMile };
    }
    return null;
  })();

  const clearFieldConfidence = (key: NewLoadScanFieldKey) => {
    setFieldConfidences((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const updateFormField = <K extends keyof NewJobForm>(
    key: K,
    value: NewJobForm[K],
    confidenceKey?: NewLoadScanFieldKey
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (confidenceKey) clearFieldConfidence(confidenceKey);
  };

  const handleDismiss = () => {
    closeSheet();
    router.push(APP_ROUTES.dashboard);
  };

  const applyTemplate = (template: LoadTemplate) => {
    resetScanState();
    setForm({
      jobName: template.job_name,
      rateConNumber: template.rate_con_number ?? "",
      bolNumber: template.bol_number ?? "",
      loadValue: template.load_value?.toString() ?? "",
      brokerName: template.broker_name ?? "",
      brokerId: null,
      brokerVerified: false,
      pickupLocation: template.pickup_location ?? "",
      pickupFacility: template.pickup_facility ?? "",
      deliveryLocation: template.delivery_location ?? "",
      deliveryFacility: template.delivery_facility ?? "",
      pickupDate: "",
      deliveryDate: "",
      paymentType: (template.payment_type as PaymentType) ?? "direct",
      factoringCompany: template.factoring_company ?? "",
      saveAsTemplate: false,
      templateName: "",
      miles: template.miles?.toString() ?? "",
      notes: template.notes ?? "",
    });
  };

  const runRateConScan = async (file: File, skipQualityCheck = false) => {
    setScanning(true);
    setScanMessage(null);
    setQualityIssue(false);

    if (!validateFileType(file)) {
      setScanMessage(
        "That file type isn't supported. Take a photo or upload a JPEG, PNG, or PDF."
      );
      setScanning(false);
      return;
    }

    if (file.type !== "application/pdf" && !skipQualityCheck) {
      const quality = await checkImageQuality(file);
      if (!quality.acceptable) {
        setPendingScanFile(file);
        setQualityIssue(true);
        setScanning(false);
        return;
      }
    }

    const result = await parseRateConPreview(file);

    if (!result.ok) {
      if (result.rateLimited) {
        setScanMessage(
          "You've reached the AI scan limit for now. Fill in the details below or try again later."
        );
      } else {
        setScanMessage(
          "Couldn't read that clearly — you can fill in the details below."
        );
      }
      setScanning(false);
      return;
    }

    const applied = applyRateConParsedToNewLoadForm(result.parsed);

    if (!hasUsableRateConExtraction(applied.parsedData)) {
      setScanMessage(
        "Couldn't read that clearly — you can fill in the details below."
      );
      setScanning(false);
      return;
    }

    let scannedBrokerId: string | null = null;
    if (applied.formValues.brokerName?.trim()) {
      try {
        const linked = await ensureJobBrokerLink(applied.formValues.brokerName, null);
        scannedBrokerId = linked.brokerId;
      } catch {
        scannedBrokerId = null;
      }
    }

    setForm((current) => ({
      ...current,
      ...applied.formValues,
      brokerId: scannedBrokerId,
      brokerVerified: false,
    }));
    setFieldConfidences(applied.fieldConfidences);
    setScannedFile(file);
    setScannedParsedData(applied.parsedData);
    setScannedDocConfidence(applied.documentConfidence);
    setScanMessage(null);
    triggerHaptic("medium");
    setScanning(false);
  };

  const handleScanFileSelect = async (file: File | undefined) => {
    if (!file || scanning) return;
    await runRateConScan(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createLoad = async () => {
    if (!user) return;

    if (!canCreateJob(profile, jobCount, hasProAccess)) {
      openPaywall({ variant: "generic" });
      return;
    }

    const jobNameError = validateTextLength(
      form.jobName,
      TEXT_LIMITS.jobName,
      "Job name"
    );
    const loadValueError = form.loadValue
      ? validateLoadValue(form.loadValue)
      : null;

    setErrors({ jobName: jobNameError, loadValue: loadValueError });
    if (jobNameError || loadValueError) return;

    if (form.saveAsTemplate && !form.templateName.trim()) {
      setErrors({
        jobName: jobNameError,
        loadValue: loadValueError,
        templateName: "Enter a template name to save this load.",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const loadValue = form.loadValue
      ? Number(form.loadValue.replace(/[^0-9.]/g, ""))
      : null;
    const milesNum = estimatedMiles ? Number(estimatedMiles) : null;
    const profitabilityScore = profitabilityEstimate?.net ?? null;

    let brokerName = sanitizeText(form.brokerName) || null;
    let brokerId = form.brokerId;

    if (brokerName) {
      try {
        const linked = await ensureJobBrokerLink(brokerName, brokerId);
        brokerName = linked.brokerName;
        brokerId = linked.brokerId;
      } catch {
        setErrors({ jobName: "Could not save broker. Try again." });
        setLoading(false);
        return;
      }
    }

    const jobPayload = {
      user_id: user.id,
      job_name: sanitizeText(form.jobName),
      status: "active" as const,
      broker_name: brokerName,
      broker_id: brokerId,
      load_value: loadValue,
      rate_con_number: sanitizeText(form.rateConNumber) || null,
      bol_number: sanitizeText(form.bolNumber) || null,
      pickup_location: sanitizeText(form.pickupLocation) || null,
      pickup_facility: sanitizeText(form.pickupFacility) || null,
      delivery_location: sanitizeText(form.deliveryLocation) || null,
      delivery_facility: sanitizeText(form.deliveryFacility) || null,
      pickup_date: form.pickupDate.trim() || null,
      delivery_date: form.deliveryDate.trim() || null,
      payment_type: form.paymentType,
      factoring_company:
        form.paymentType === "factoring"
          ? sanitizeText(form.factoringCompany) || null
          : null,
      miles: milesNum,
      notes: sanitizeText(form.notes) || null,
      profitability_score: profitabilityScore,
      is_template: false,
      updated_at: new Date().toISOString(),
    };

    const { data: job, error } = await supabase
      .from("jobs")
      .insert(jobPayload)
      .select("id")
      .single();

    if (error || !job) {
      if (error?.message?.includes("free_tier_load_limit")) {
        openPaywall({ variant: "generic" });
      } else {
        setErrors({ jobName: "Could not create load. Try again." });
      }
      setLoading(false);
      return;
    }

    if (scannedFile && scannedParsedData && scannedDocConfidence) {
      try {
        await attachScannedRateCon(supabase, {
          userId: user.id,
          jobId: job.id,
          file: scannedFile,
          parsedData: scannedParsedData,
          aiConfidence: scannedDocConfidence,
        });
      } catch (attachError) {
        console.error("attach scanned rate con failed:", attachError);
      }
    }

    if (form.saveAsTemplate && form.templateName.trim()) {
      const { error: templateError } = await supabase.from("jobs").insert({
        ...jobPayload,
        job_name: sanitizeText(form.templateName),
        template_name: sanitizeText(form.templateName),
        is_template: true,
      });

      if (templateError) {
        setErrors({ jobName: "Load created, but template save failed." });
      }
    }

    triggerHaptic("medium");
    setLoading(false);
    closeSheet();
    router.push(`${APP_ROUTES.loads}/${job.id}`);
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={handleDismiss}
        title="New Load"
        ariaLabel="New load"
        surface="solid"
      >
        {templates.length > 0 ? (
          <div className="mb-5">
            <p className="tv-label mb-2">Your Templates</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="tv-chip tv-chip-inactive h-11 shrink-0 rounded-full px-4 text-[14px]"
                >
                  {template.template_name || template.job_name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handleScanFileSelect(e.target.files?.[0]);
            }}
          />
          <TvButton
            loading={scanning}
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
          >
            {scanning ? (
              <>
                <Loader2 className="size-5 animate-spin" strokeWidth={2} />
                Reading rate con...
              </>
            ) : (
              <>
                <Camera className="size-5" strokeWidth={2} />
                Scan Rate Con to Auto-Fill
              </>
            )}
          </TvButton>
          {scanMessage ? (
            <p className="mt-3 text-[14px] text-[var(--color-text-secondary)]">
              {scanMessage}
            </p>
          ) : null}
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-shell-border)]" />
          <span className="tv-caption normal-case tracking-normal text-[var(--color-text-muted)]">
            or enter manually
          </span>
          <div className="h-px flex-1 bg-[var(--color-shell-border)]" />
        </div>

        <div className="flex flex-col gap-4" data-tour="new-load-form">
          <div>
            <ScanFieldLabel
              label="Job Name"
              confidence={fieldConfidences.jobName}
            />
            <TvInput
              label=""
              borderVariant="gold"
              placeholder="e.g. Dallas → Memphis · Jun 12"
              helper="Name your load so you can find it easily"
              maxLength={TEXT_LIMITS.jobName}
              counter={getTextCounter(form.jobName, TEXT_LIMITS.jobName) ?? undefined}
              value={form.jobName}
              onChange={(e) =>
                updateFormField("jobName", e.target.value, "jobName")
              }
              error={errors.jobName}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <ScanFieldLabel
                label="Rate Con #"
                confidence={fieldConfidences.rateConNumber}
              />
              <TvInput
                label=""
                borderVariant="gold"
                placeholder="e.g. RC-123456"
                maxLength={TEXT_LIMITS.broker}
                value={form.rateConNumber}
                onChange={(e) =>
                  updateFormField("rateConNumber", e.target.value, "rateConNumber")
                }
              />
            </div>
            <div>
              <ScanFieldLabel label="BOL #" />
              <TvInput
                label=""
                borderVariant="gold"
                placeholder="e.g. BOL-789012"
                maxLength={TEXT_LIMITS.broker}
                value={form.bolNumber}
                onChange={(e) => updateFormField("bolNumber", e.target.value)}
                helper="Add later from the load's document checklist once you have the Bill of Lading"
              />
            </div>
          </div>

          <div>
            <ScanFieldLabel
              label="Load Value"
              confidence={fieldConfidences.loadValue}
            />
            <TvInput
              label=""
              borderVariant="gold"
              inputMode="decimal"
              placeholder="0"
              value={form.loadValue}
              onChange={(e) =>
                updateFormField(
                  "loadValue",
                  e.target.value.replace(/[^0-9.]/g, ""),
                  "loadValue"
                )
              }
              error={errors.loadValue}
            />
          </div>

          <div>
            <ScanFieldLabel
              label="Broker"
              confidence={fieldConfidences.brokerName}
            />
            <BrokerAutocomplete
              value={form.brokerName}
              brokerId={form.brokerId}
              verified={form.brokerVerified}
              onChange={(selection) => {
                setForm((current) => ({
                  ...current,
                  brokerName: selection.brokerName,
                  brokerId: selection.brokerId,
                  brokerVerified: selection.verified,
                }));
                clearFieldConfidence("brokerName");
              }}
            />
          </div>

          <div>
            <ScanFieldLabel
              label="Pickup Location"
              confidence={fieldConfidences.pickupLocation}
            />
            <TvInput
              label=""
              borderVariant="gold"
              maxLength={TEXT_LIMITS.location}
              value={form.pickupLocation}
              onChange={(e) =>
                updateFormField("pickupLocation", e.target.value, "pickupLocation")
              }
            />
          </div>

          <div>
            <ScanFieldLabel label="Pickup Facility" />
            <TvInput
              label=""
              borderVariant="gold"
              placeholder="e.g. Atlanta Produce Terminal"
              maxLength={TEXT_LIMITS.location}
              value={form.pickupFacility}
              onChange={(e) =>
                updateFormField("pickupFacility", e.target.value)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <ScanFieldLabel
                label="Pickup Date"
                confidence={fieldConfidences.pickupDate}
              />
              <TvDateInput
                label=""
                value={form.pickupDate}
                onChange={(e) =>
                  updateFormField("pickupDate", e.target.value, "pickupDate")
                }
              />
            </div>
            <div>
              <ScanFieldLabel
                label="Delivery Date"
                confidence={fieldConfidences.deliveryDate}
              />
              <TvDateInput
                label=""
                value={form.deliveryDate}
                onChange={(e) =>
                  updateFormField("deliveryDate", e.target.value, "deliveryDate")
                }
              />
            </div>
          </div>

          <div>
            <ScanFieldLabel
              label="Delivery Location"
              confidence={fieldConfidences.deliveryLocation}
            />
            <TvInput
              label=""
              borderVariant="gold"
              maxLength={TEXT_LIMITS.location}
              value={form.deliveryLocation}
              onChange={(e) =>
                updateFormField(
                  "deliveryLocation",
                  e.target.value,
                  "deliveryLocation"
                )
              }
            />
          </div>

          <div>
            <ScanFieldLabel label="Delivery Facility" />
            <TvInput
              label=""
              borderVariant="gold"
              placeholder="e.g. Miami Cool Storage"
              maxLength={TEXT_LIMITS.location}
              value={form.deliveryFacility}
              onChange={(e) =>
                updateFormField("deliveryFacility", e.target.value)
              }
            />
          </div>

          <div>
            <p className="tv-label mb-2">Payment Structure</p>
            <div className="tv-payment-segment grid grid-cols-2 gap-1">
              {(["direct", "factoring"] as PaymentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    updateFormField("paymentType", type, "paymentType");
                  }}
                  className={`h-12 rounded-lg text-[15px] transition-colors ${
                    form.paymentType === type
                      ? "tv-payment-selected font-medium"
                      : "tv-payment-unselected"
                  }`}
                >
                  {type === "direct" ? "Direct Payment" : "Factoring Company"}
                </button>
              ))}
            </div>
            {fieldConfidences.paymentType ? (
              <div className="mt-2 flex justify-end">
                <FieldTrustBadge confidence={fieldConfidences.paymentType} />
              </div>
            ) : null}
          </div>

          <div className={form.paymentType === "factoring" ? "block" : "hidden"}>
            <ScanFieldLabel
              label="Factoring Company"
              confidence={fieldConfidences.factoringCompany}
            />
            <TvInput
              label=""
              borderVariant="gold"
              maxLength={TEXT_LIMITS.broker}
              value={form.factoringCompany}
              onChange={(e) =>
                updateFormField(
                  "factoringCompany",
                  e.target.value,
                  "factoringCompany"
                )
              }
            />
          </div>

          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={form.saveAsTemplate}
              onChange={(e) =>
                setForm((f) => ({ ...f, saveAsTemplate: e.target.checked }))
              }
              className="size-5 rounded border border-[var(--color-shell-border)] bg-[var(--color-input-bg)] accent-[var(--color-accent)]"
            />
            <span className="tv-body text-[var(--color-text-secondary)]">
              Save as Load Template
            </span>
          </label>

          {form.saveAsTemplate ? (
            <TvInput
              label="Template Name"
              borderVariant="gold"
              labelVariant="readable"
              maxLength={TEXT_LIMITS.jobName}
              value={form.templateName}
              onChange={(e) =>
                setForm((f) => ({ ...f, templateName: e.target.value }))
              }
              error={errors.templateName}
            />
          ) : null}

          {showProfitPreview ? (
            <div className="tv-glass-card rounded-2xl p-4">
              <p className="tv-caption">Profitability estimate</p>
              {profitabilityEstimate ? (
                <p className="tv-body mt-2">
                  Based on your{" "}
                  <span className="tv-tabular">
                    {formatCurrencyDetailed(profitabilityEstimate.costPerMile)}
                  </span>{" "}
                  avg cost/mile and {profitabilityEstimate.milesNum} estimated miles:
                  Estimated net{" "}
                  <span className="tv-tabular">
                    {formatCurrencyDetailed(profitabilityEstimate.net)}
                  </span>{" "}
                  —{" "}
                  <span className="tv-tabular">
                    {formatCurrencyDetailed(profitabilityEstimate.perMile)}
                  </span>
                  /mile profit
                </p>
              ) : (
                <p className="tv-body mt-2 text-[var(--color-text-secondary)]">
                  Add your load value and we&apos;ll track your net after expenses.
                </p>
              )}
              <p className="tv-caption mt-2 normal-case tracking-normal text-[var(--color-text-muted)]">
                Estimate only — updates with actual expenses
              </p>
            </div>
          ) : null}

          <div className="pt-1">
            <TvButton loading={loading} onClick={createLoad}>
              Create Load
            </TvButton>

            {loading ? (
              <p className="tv-compiling-dots tv-caption mt-4 flex items-center justify-center gap-2 normal-case tracking-[0.14em]">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
                  <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
                  <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
                </span>
                Compiling assets...
              </p>
            ) : null}
          </div>
        </div>

      </BottomSheet>

      <BottomSheet
        open={qualityIssue}
        onClose={() => setQualityIssue(false)}
        title="Photo Quality Issue"
        ariaLabel="Photo quality"
      >
        <p className="text-[15px] text-[var(--color-text-secondary)]">
          A clearer photo helps us fill in your details automatically.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <TvButton
            onClick={() => {
              setQualityIssue(false);
              fileInputRef.current?.click();
            }}
          >
            Retake Photo
          </TvButton>
          {pendingScanFile ? (
            <TvButton
              variant="secondary"
              onClick={() => {
                setQualityIssue(false);
                void runRateConScan(pendingScanFile, true);
                setPendingScanFile(null);
              }}
            >
              Use Anyway
            </TvButton>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}

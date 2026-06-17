"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvInput } from "@/components/tv/tv-input";
import { useNewJobSheet } from "@/components/providers/new-job-provider";
import { triggerHaptic } from "@/lib/haptics";
import { estimateMiles } from "@/lib/job-folder/mileage";
import { formatCurrencyDetailed } from "@/lib/dashboard/format";
import {
  sanitizeText,
  validateTextLength,
  validateLoadValue,
  getTextCounter,
} from "@/lib/validation";
import { TEXT_LIMITS, APP_ROUTES } from "@/lib/constants";
import { canCreateJob, countUserJobs } from "@/lib/pro-tier";
import type { LoadTemplate } from "@/types/job-folder";
import type { PaymentType } from "@/types/jobs";

interface NewJobForm {
  jobName: string;
  loadValue: string;
  brokerName: string;
  pickupLocation: string;
  deliveryLocation: string;
  paymentType: PaymentType;
  factoringCompany: string;
  saveAsTemplate: boolean;
  templateName: string;
  miles: string;
  notes: string;
}

const emptyForm: NewJobForm = {
  jobName: "",
  loadValue: "",
  brokerName: "",
  pickupLocation: "",
  deliveryLocation: "",
  paymentType: "direct",
  factoringCompany: "",
  saveAsTemplate: false,
  templateName: "",
  miles: "",
  notes: "",
};

export function NewJobSheet() {
  const { open, closeSheet } = useNewJobSheet();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<NewJobForm>(emptyForm);
  const [templates, setTemplates] = useState<LoadTemplate[]>([]);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [jobCount, setJobCount] = useState(0);
  const [showUpgradeLock, setShowUpgradeLock] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, job_name, broker_name, load_value, pickup_location, delivery_location, payment_type, factoring_company, miles, notes, template_name"
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
    else setForm(emptyForm);
  }, [open, loadTemplates]);

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

  const handleDismiss = () => {
    closeSheet();
    router.push(APP_ROUTES.dashboard);
  };

  const applyTemplate = (template: LoadTemplate) => {
    setForm({
      jobName: template.job_name,
      loadValue: template.load_value?.toString() ?? "",
      brokerName: template.broker_name ?? "",
      pickupLocation: template.pickup_location ?? "",
      deliveryLocation: template.delivery_location ?? "",
      paymentType: (template.payment_type as PaymentType) ?? "direct",
      factoringCompany: template.factoring_company ?? "",
      saveAsTemplate: false,
      templateName: "",
      miles: template.miles?.toString() ?? "",
      notes: template.notes ?? "",
    });
  };

  const createLoad = async () => {
    if (!user) return;

    if (!canCreateJob(profile, jobCount)) {
      setShowUpgradeLock(true);
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

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        job_name: sanitizeText(form.jobName),
        status: "active",
        broker_name: sanitizeText(form.brokerName) || null,
        load_value: loadValue,
        pickup_location: sanitizeText(form.pickupLocation) || null,
        delivery_location: sanitizeText(form.deliveryLocation) || null,
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
      })
      .select("id")
      .single();

    if (error || !job) {
      if (error?.message?.includes("free_tier_load_limit")) {
        setShowUpgradeLock(true);
      } else {
        setErrors({ jobName: "Could not create load. Try again." });
      }
      setLoading(false);
      return;
    }

    if (form.saveAsTemplate && form.templateName.trim()) {
      const { error: templateError } = await supabase.from("jobs").insert({
        user_id: user.id,
        job_name: sanitizeText(form.templateName),
        template_name: sanitizeText(form.templateName),
        status: "active",
        broker_name: sanitizeText(form.brokerName) || null,
        load_value: loadValue,
        pickup_location: sanitizeText(form.pickupLocation) || null,
        delivery_location: sanitizeText(form.deliveryLocation) || null,
        payment_type: form.paymentType,
        factoring_company:
          form.paymentType === "factoring"
            ? sanitizeText(form.factoringCompany) || null
            : null,
        miles: milesNum,
        notes: sanitizeText(form.notes) || null,
        is_template: true,
        updated_at: new Date().toISOString(),
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

      <div className="flex flex-col gap-4" data-tour="new-load-form">
        <TvInput
          label="Job Name"
          borderVariant="gold"
          labelVariant="readable"
          placeholder="e.g. Dallas → Memphis · 12 Jun"
          helper="Name your load so you can find it easily"
          maxLength={TEXT_LIMITS.jobName}
          counter={getTextCounter(form.jobName, TEXT_LIMITS.jobName) ?? undefined}
          value={form.jobName}
          onChange={(e) => setForm((f) => ({ ...f, jobName: e.target.value }))}
          error={errors.jobName}
        />

        <TvInput
          label="Load Value"
          borderVariant="gold"
          labelVariant="readable"
          inputMode="decimal"
          placeholder="0"
          value={form.loadValue}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              loadValue: e.target.value.replace(/[^0-9.]/g, ""),
            }))
          }
          error={errors.loadValue}
        />

        <TvInput
          label="Broker"
          borderVariant="gold"
          labelVariant="readable"
          maxLength={TEXT_LIMITS.broker}
          counter={getTextCounter(form.brokerName, TEXT_LIMITS.broker) ?? undefined}
          value={form.brokerName}
          onChange={(e) => setForm((f) => ({ ...f, brokerName: e.target.value }))}
        />

        <TvInput
          label="Pickup Location"
          borderVariant="gold"
          labelVariant="readable"
          maxLength={TEXT_LIMITS.location}
          value={form.pickupLocation}
          onChange={(e) =>
            setForm((f) => ({ ...f, pickupLocation: e.target.value }))
          }
        />

        <TvInput
          label="Delivery Location"
          borderVariant="gold"
          labelVariant="readable"
          maxLength={TEXT_LIMITS.location}
          value={form.deliveryLocation}
          onChange={(e) =>
            setForm((f) => ({ ...f, deliveryLocation: e.target.value }))
          }
        />

        <div>
          <p className="tv-label mb-2">Payment Structure</p>
          <div className="tv-payment-segment grid grid-cols-2 gap-1">
            {(["direct", "factoring"] as PaymentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentType: type }))}
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
        </div>

        <div className={form.paymentType === "factoring" ? "block" : "hidden"}>
          <TvInput
              label="Factoring Company"
              borderVariant="gold"
              labelVariant="readable"
              maxLength={TEXT_LIMITS.broker}
              value={form.factoringCompany}
              onChange={(e) =>
                setForm((f) => ({ ...f, factoringCompany: e.target.value }))
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

      {showUpgradeLock ? (
        <div className="mt-4 rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-4 text-center">
          <Lock
            className="mx-auto size-8 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="tv-card-title mt-3">Upgrade to create more loads</p>
          <p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">
            Free tier includes 1 load. Join T-Vault Pro to keep building.
          </p>
          <TvButton
            className="mt-4"
            onClick={async () => {
              await fetch("/api/pro-waitlist", { method: "POST" });
              setShowUpgradeLock(false);
            }}
          >
            Start Pro
          </TvButton>
        </div>
      ) : null}
    </BottomSheet>
  );
}

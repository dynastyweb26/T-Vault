"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
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
    const milesNum = Number(estimatedMiles) || estimateMiles(form.pickupLocation, form.deliveryLocation);
    if (costPerMile && milesNum) {
      const cost = costPerMile * milesNum;
      const net = loadVal - cost;
      const perMile = milesNum ? net / milesNum : 0;
      return { net, perMile, milesNum, costPerMile };
    }
    return null;
  })();

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

    const jobNameError = validateTextLength(
      form.jobName,
      TEXT_LIMITS.jobName,
      "Job name"
    );
    const loadValueError = form.loadValue
      ? validateLoadValue(form.loadValue)
      : null;

    setErrors({ jobName: jobNameError, loadValue: loadValueError });
    if (jobNameError) return;

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
      setErrors({ jobName: "Could not create load. Try again." });
      setLoading(false);
      return;
    }

    if (form.saveAsTemplate && form.templateName.trim()) {
      await supabase.from("jobs").insert({
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
    }

    triggerHaptic("medium");
    setLoading(false);
    closeSheet();
    router.push(`${APP_ROUTES.loads}/${job.id}`);
  };

  return (
    <BottomSheet open={open} onClose={closeSheet} title="New Load" ariaLabel="New load">
      {templates.length > 0 ? (
        <div className="mb-5">
          <p className="mb-2 text-[14px] uppercase text-[var(--color-text-muted)]">
            Your Templates
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="h-11 shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-accent)] px-4 text-[14px] text-[var(--color-accent)]"
              >
                {template.template_name || template.job_name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <TvInput
          label="Job Name"
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

        <div>
          <p className="tv-label mb-2">Payment Type</p>
          <div className="grid grid-cols-2 gap-2">
            {(["direct", "factoring"] as PaymentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentType: type }))}
                className={`h-14 rounded-[var(--radius-input)] border text-[15px] ${
                  form.paymentType === type
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                }`}
              >
                {type === "direct" ? "Direct Payment" : "Factoring Company"}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`grid transition-all duration-200 ${
            form.paymentType === "factoring"
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <TvInput
              label="Factoring Company"
              maxLength={TEXT_LIMITS.broker}
              value={form.factoringCompany}
              onChange={(e) =>
                setForm((f) => ({ ...f, factoringCompany: e.target.value }))
              }
            />
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.saveAsTemplate}
            onChange={(e) =>
              setForm((f) => ({ ...f, saveAsTemplate: e.target.checked }))
            }
            className="size-5 accent-[var(--color-accent)]"
          />
          <span className="text-[15px] text-[var(--color-text-primary)]">
            Save as Template
          </span>
        </label>

        {form.saveAsTemplate ? (
          <TvInput
            label="Template Name"
            maxLength={TEXT_LIMITS.jobName}
            value={form.templateName}
            onChange={(e) =>
              setForm((f) => ({ ...f, templateName: e.target.value }))
            }
          />
        ) : null}

        {showProfitPreview ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-4">
            <p className="text-[14px] font-medium text-[var(--color-warning-text)]">
              Profitability estimate
            </p>
            {profitabilityEstimate ? (
              <p className="mt-2 text-[15px] text-[var(--color-text-primary)]">
                Based on your {formatCurrencyDetailed(profitabilityEstimate.costPerMile)} avg
                cost/mile and {profitabilityEstimate.milesNum} estimated miles: Estimated net{" "}
                {formatCurrencyDetailed(profitabilityEstimate.net)} —{" "}
                {formatCurrencyDetailed(profitabilityEstimate.perMile)}/mile profit
              </p>
            ) : (
              <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
                Add your load value and we&apos;ll track your net after expenses.
              </p>
            )}
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              Estimate only — updates with actual expenses
            </p>
          </div>
        ) : null}

        <TvButton loading={loading} onClick={createLoad}>
          Create Load
        </TvButton>
      </div>
    </BottomSheet>
  );
}

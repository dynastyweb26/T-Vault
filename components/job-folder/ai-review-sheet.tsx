"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Pencil,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { JobFolderFieldInput } from "@/components/job-folder/job-folder-field-input";
import type { Job, JobDocument, AiConfidence } from "@/types/jobs";
import {
  buildJobReviewFields,
  suggestJobName,
  type RateConParsedData,
} from "@/lib/job-folder/ai-types";
import { getDocument } from "@/lib/job-folder/documents";
import { confirmAiFields } from "@/lib/job-folder/ai-parsing";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";

const badgeToneClasses = {
  high: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success)]/10",
  medium: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning)]/10",
  low: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger)]/10",
};

function FieldTrustBadge({ confidence }: { confidence: AiConfidence }) {
  if (confidence === "high") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.high}`}>
        <Bot className="size-3.5" strokeWidth={2} />
        AI verified
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ${badgeToneClasses.low}`}>
      <AlertTriangle className="size-3.5" strokeWidth={2} />
      Enter manually
    </span>
  );
}

interface AiReviewSheetProps {
  open: boolean;
  onClose: () => void;
  job: Job;
  documents: JobDocument[];
  userId: string;
  profile: UserProfile | null;
  onConfirmed: () => void;
}

type ReviewField = {
  key: keyof Job | string;
  label: string;
  value: string;
  confidence: AiConfidence;
  editable: boolean;
};

export function AiReviewSheet({
  open,
  onClose,
  job,
  documents,
  userId,
  profile,
  onConfirmed,
}: AiReviewSheetProps) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ReviewField[]>([]);
  const [jobName, setJobName] = useState(job.job_name);

  const suggestedName = useMemo(() => {
    const rateCon = getDocument(documents, "rate_confirmation");
    const parsed = rateCon?.parsed_data as RateConParsedData | undefined;
    return suggestJobName(
      parsed?.broker_name?.value ?? job.broker_name,
      parsed?.pickup_location?.value ?? job.pickup_location,
      parsed?.delivery_location?.value ?? job.delivery_location
    );
  }, [documents, job]);

  useEffect(() => {
    if (!open) return;

    const reviewFields: ReviewField[] = buildJobReviewFields(job, documents).map(
      (field) => ({
        ...field,
        editable: true,
      })
    );

    setFields(reviewFields);
    setJobName(job.job_name?.trim() ? job.job_name : "");
    setEditMode(false);
  }, [open, documents, job]);

  const handleConfirm = async () => {
    setSaving(true);
    const supabase = createClient();
    const fieldValues: Partial<Job> = {};

    for (const field of fields) {
      if (!field.editable) continue;
      const key = field.key as keyof Job;
      if (key === "load_value" || key === "miles") {
        const num = Number(field.value.replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(num)) {
          (fieldValues as Record<string, unknown>)[key] = num;
        }
      } else {
        (fieldValues as Record<string, unknown>)[key] = field.value;
      }
    }

    if (!job.job_name?.trim() && jobName.trim()) {
      fieldValues.job_name = jobName.trim();
    }

    await confirmAiFields(supabase, {
      jobId: job.id,
      userId,
      job,
      profile,
      fieldValues,
    });

    setSaving(false);
    onConfirmed();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Review AI Details"
      ariaLabel="Review AI extracted details"
    >
      <p className="text-[14px] text-[var(--color-text-secondary)]">
        Confirm extracted details before they&apos;re saved to this load.
      </p>

      {!job.job_name?.trim() ? (
        <TvInput
          label="Job Name"
          placeholder={suggestedName}
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          className="mt-4"
        />
      ) : null}

      <div className="mt-4 space-y-3">
        {fields.map((field, index) => (
          <div
            key={String(field.key)}
            className="rounded-2xl tv-glass-card border border-white/5 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="tv-label">{field.label}</p>
              <FieldTrustBadge confidence={field.confidence} />
            </div>
            {editMode ? (
              <JobFolderFieldInput
                fieldKey={String(field.key)}
                value={field.value}
                onChange={(value) => {
                  const next = [...fields];
                  next[index] = { ...field, value };
                  setFields(next);
                }}
                hideLabel
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-[17px] font-bold">{field.value || "—"}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <TvButton
          disabled={saving}
          onClick={handleConfirm}
          className="bg-[var(--color-success)] text-[var(--color-success-text)]"
        >
          <Check className="size-5" strokeWidth={2} />
          Confirm All
        </TvButton>
        <TvButton
          variant="secondary"
          disabled={saving}
          onClick={() => setEditMode(true)}
        >
          <Pencil className="size-5" strokeWidth={2} />
          Edit Before Confirming
        </TvButton>
      </div>
    </BottomSheet>
  );
}

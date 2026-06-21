"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { JobFolderFieldInput } from "@/components/job-folder/job-folder-field-input";
import { DOC_TYPE_LABELS } from "@/lib/job-folder/constants";
import {
  buildManualFieldUpdates,
  getManualFieldDefinitions,
  loadManualFieldValues,
  validateManualFieldValues,
} from "@/lib/job-folder/document-fields";
import { updateJobProfitability } from "@/lib/job-folder/profitability";
import type { ManualDocumentSavePayload } from "@/lib/job-folder/manual-document-save";
import { ManualDocumentSaveError } from "@/lib/job-folder/manual-document-save";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";
import type { Job, JobDocument } from "@/types/jobs";

export type { ManualDocumentSavePayload } from "@/lib/job-folder/manual-document-save";

interface DocumentManualEntrySheetProps {
  open: boolean;
  onClose: () => void;
  documentType: string | null;
  job: Job;
  documents: JobDocument[];
  userId: string;
  profile: UserProfile | null;
  onSave: (payload: ManualDocumentSavePayload) => Promise<void>;
}

export function DocumentManualEntrySheet({
  open,
  onClose,
  documentType,
  job,
  documents,
  userId,
  profile,
  onSave,
}: DocumentManualEntrySheetProps) {
  const definitions = documentType ? getManualFieldDefinitions(documentType) : [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documentType) return;

    let cancelled = false;
    setLoadingFields(true);
    setError(null);

    (async () => {
      const supabase = createClient();
      const defs = getManualFieldDefinitions(documentType);

      const [{ data: docRow }, { data: jobRow }] = await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("job_id", job.id)
          .eq("user_id", userId)
          .eq("document_type", documentType)
          .maybeSingle(),
        supabase.from("jobs").select("*").eq("id", job.id).eq("user_id", userId).single(),
      ]);

      if (cancelled) return;

      const sourceJob = (jobRow as Job | null) ?? job;
      const sourceDoc =
        (docRow as JobDocument | null) ??
        documents.find((doc) => doc.document_type === documentType);

      setValues(loadManualFieldValues(defs, sourceJob, sourceDoc));
      setLoadingFields(false);
    })().catch(() => {
      if (cancelled) return;
      const defs = getManualFieldDefinitions(documentType);
      setValues(
        loadManualFieldValues(
          defs,
          job,
          documents.find((doc) => doc.document_type === documentType)
        )
      );
      setLoadingFields(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, documentType, job, documents, userId]);

  const title =
    documentType &&
    (DOC_TYPE_LABELS[documentType as keyof typeof DOC_TYPE_LABELS] ?? "Document");

  const handleSave = async () => {
    if (!documentType || !definitions.length) return;

    const validationError = validateManualFieldValues(definitions, values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    const { jobUpdates, documentData } = buildManualFieldUpdates(definitions, values);

    try {
      await onSave({ jobUpdates, documentType, documentData });

      const mergedJob = { ...job, ...jobUpdates };
      if (mergedJob.miles && mergedJob.miles > 0) {
        await updateJobProfitability(
          createClient(),
          {
            id: job.id,
            load_value: mergedJob.load_value,
            miles: mergedJob.miles,
          },
          userId,
          profile
        );
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof ManualDocumentSaveError
          ? err.message
          : "Could not save details. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title ? `Enter ${title} Details` : "Enter Details"}
      ariaLabel="Enter document details manually"
    >
      <p className="text-[14px] text-[var(--color-text-secondary)]">
        Fill in load details manually for this document.
      </p>

      {loadingFields ? (
        <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
          Loading saved details...
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {definitions.map((def) => (
            <JobFolderFieldInput
              key={def.key}
              fieldKey={def.key}
              label={def.label}
              placeholder={def.placeholder}
              inputType={def.inputType}
              rows={def.rows}
              value={values[def.key] ?? ""}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, [def.key]: value }))
              }
            />
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-3 text-[14px] text-[var(--color-danger-text)]">{error}</p>
      ) : null}

      <TvButton
        className="mt-6"
        disabled={saving || loadingFields || !definitions.length}
        onClick={handleSave}
      >
        Save Details
      </TvButton>
    </BottomSheet>
  );
}

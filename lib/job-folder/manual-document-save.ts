import type { SupabaseClient } from "@supabase/supabase-js";
import { getDocument, isManualDocumentEntry } from "@/lib/job-folder/documents";
import type { Job, JobDocument } from "@/types/jobs";

export type ManualDocumentSavePayload = {
  jobUpdates: Partial<Job>;
  documentType: string;
  documentData: Record<string, string>;
};

export class ManualDocumentSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualDocumentSaveError";
  }
}

function manualPlaceholderUrl(documentType: string): string {
  return `manual://${documentType}`;
}

function isRealFileUrl(fileUrl: string | null | undefined): boolean {
  return Boolean(fileUrl) && !fileUrl!.startsWith("manual://");
}

export async function saveManualDocumentEntry(
  supabase: SupabaseClient,
  params: {
    jobId: string;
    userId: string;
    payload: ManualDocumentSavePayload;
  }
): Promise<JobDocument> {
  const { jobId, userId, payload } = params;
  const { jobUpdates, documentType, documentData } = payload;

  if (Object.keys(jobUpdates).length > 0) {
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ ...jobUpdates, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("user_id", userId);

    if (jobError) {
      throw new ManualDocumentSaveError(jobError.message);
    }
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("documents")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (existingError) {
    throw new ManualDocumentSaveError(existingError.message);
  }

  const existing = existingRow as JobDocument | null;
  const existingManual =
    existing?.manual_fields && typeof existing.manual_fields === "object"
      ? existing.manual_fields
      : existing?.parsed_data && typeof existing.parsed_data === "object"
        ? existing.parsed_data
        : {};

  const manualFields = { ...existingManual, ...documentData };

  const baseRow = {
    job_id: jobId,
    user_id: userId,
    document_type: documentType,
    file_url: isRealFileUrl(existing?.file_url)
      ? existing!.file_url
      : manualPlaceholderUrl(documentType),
    file_name: existing?.file_name ?? `${documentType}-manual`,
    upload_status: "uploaded",
  };

  const confidenceValues: Array<JobDocument["ai_confidence"]> = [
    "manual",
    "unread",
  ];

  let saved: JobDocument | null = null;

  outer: for (const aiConfidence of confidenceValues) {
    const rowVariants: Array<Record<string, unknown>> = [
      { ...baseRow, ai_confidence: aiConfidence, manual_fields: manualFields },
      { ...baseRow, ai_confidence: aiConfidence, parsed_data: manualFields },
      { ...baseRow, ai_confidence: aiConfidence },
    ];

    for (const rowVariant of rowVariants) {
      if (existing?.id) {
        const { data, error } = await supabase
          .from("documents")
          .update(rowVariant)
          .eq("id", existing.id)
          .select("*")
          .single();

        if (!error && data) {
          saved = data as JobDocument;
          break outer;
        }

        if (error && !isMissingColumnError(error.message)) {
          throw new ManualDocumentSaveError(error.message);
        }
      } else {
        const { data, error } = await supabase
          .from("documents")
          .insert({
            ...rowVariant,
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (!error && data) {
          saved = data as JobDocument;
          break outer;
        }

        if (error && !isMissingColumnError(error.message)) {
          throw new ManualDocumentSaveError(error.message);
        }
      }
    }
  }

  if (!saved?.id) {
    throw new ManualDocumentSaveError(
      "Could not save document row. Run the latest Supabase migrations."
    );
  }

  return saved;
}

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("manual_fields") ||
    lower.includes("parsed_data") ||
    lower.includes("column") ||
    lower.includes("schema cache")
  );
}

export async function fetchJobFolderDocuments(
  supabase: SupabaseClient,
  jobId: string,
  userId: string
): Promise<{ job: Job; documents: JobDocument[] }> {
  const [jobRes, docsRes] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single(),
    supabase
      .from("documents")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId),
  ]);

  if (jobRes.error || !jobRes.data) {
    throw new ManualDocumentSaveError(jobRes.error?.message ?? "Job not found.");
  }

  if (docsRes.error) {
    throw new ManualDocumentSaveError(docsRes.error.message);
  }

  return {
    job: jobRes.data as Job,
    documents: (docsRes.data ?? []) as JobDocument[],
  };
}

export async function saveManualDocumentEntryAndVerify(
  supabase: SupabaseClient,
  params: {
    jobId: string;
    userId: string;
    payload: ManualDocumentSavePayload;
  }
): Promise<{ job: Job; documents: JobDocument[]; document: JobDocument }> {
  await saveManualDocumentEntry(supabase, params);

  const { job, documents } = await fetchJobFolderDocuments(
    supabase,
    params.jobId,
    params.userId
  );

  const document = getDocument(documents, params.payload.documentType);
  if (!document || !isManualDocumentEntry(document)) {
    throw new ManualDocumentSaveError(
      "Manual entry did not persist — check documents table permissions."
    );
  }

  return { job, documents, document };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job, JobDocument } from "@/types/jobs";
import type { UserProfile } from "@/types/database";
import {
  aggregateDocumentConfidence,
  buildJobReviewFields,
  buildLowConfidenceParsedData,
  isParseableDocType,
  parseDocumentFields,
  type ParseableDocType,
  type ParsedDocumentData,
} from "@/lib/job-folder/ai-types";
import { detectCrossValidationConflicts } from "@/lib/job-folder/cross-validation";
import { ensureJobBrokerLink, normalizeBrokerName } from "@/lib/brokers/link-job-broker";
import { updateJobProfitability } from "@/lib/job-folder/profitability";

export type ParseResult =
  | { status: "complete"; documentId: string }
  | { status: "skipped"; reason: "poor_quality" | "unsupported_type" }
  | { status: "rate_limited" }
  | { status: "failed"; message: string; retryable: boolean };

const GENERIC_PARSE_ERROR =
  "AI parsing failed. You can enter details manually.";

async function saveParsedDocument(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  parsedData: ParsedDocumentData,
  status: "complete" | "skipped" | "failed",
  aiConfidence: JobDocument["ai_confidence"],
  parseError?: string | null
) {
  await supabase
    .from("documents")
    .update({
      parsed_data: parsedData,
      parsing_status: status,
      ai_confidence: aiConfidence,
      parse_error: parseError ?? null,
    })
    .eq("id", documentId)
    .eq("user_id", userId);
}

async function refreshDocumentsAndCrossValidate(
  supabase: SupabaseClient,
  jobId: string,
  userId: string,
  documents: JobDocument[]
): Promise<JobDocument[]> {
  const { data: refreshedDocs } = await supabase
    .from("documents")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId);

  const docs = (refreshedDocs ?? documents) as JobDocument[];
  const conflicts = detectCrossValidationConflicts(docs);

  await supabase
    .from("jobs")
    .update({
      cross_validation_conflicts:
        conflicts.length > 0 ? conflicts : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId);

  return docs;
}

export async function applyLayer1PoorQuality(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    documentType: ParseableDocType;
    userId: string;
  }
): Promise<void> {
  const parsedData = buildLowConfidenceParsedData(params.documentType);
  await saveParsedDocument(
    supabase,
    params.documentId,
    params.userId,
    parsedData,
    "skipped",
    "low",
    "poor_quality"
  );
}

export async function invokeParseEdgeFunction(
  supabase: SupabaseClient,
  documentId: string
): Promise<
  | { ok: true; parsed: Record<string, unknown>; documentType: string }
  | { ok: false; rateLimited?: boolean; error?: string }
> {
  const { data, error } = await supabase.functions.invoke("parse-document", {
    body: { documentId },
  });

  if (error) {
    console.error("parse-document invoke failed:", error.message);
    if (error.message?.includes("429") || data?.rateLimited) {
      return { ok: false, rateLimited: true };
    }
    return { ok: false, error: "parse_failed" };
  }

  if (data?.rateLimited) {
    return { ok: false, rateLimited: true };
  }

  if (data?.error) {
    console.error("parse-document returned error:", data.error);
    return { ok: false, error: "parse_failed" };
  }

  return {
    ok: true,
    parsed: data.parsed as Record<string, unknown>,
    documentType: data.documentType as string,
  };
}

export async function processParsedResult(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    documentType: ParseableDocType;
    rawParsed: Record<string, unknown>;
    jobId: string;
    userId: string;
    documents: JobDocument[];
  }
): Promise<JobDocument[]> {
  const parsedData = parseDocumentFields(params.documentType, params.rawParsed);
  const fields = Object.values(parsedData);
  const aiConfidence = aggregateDocumentConfidence(fields);

  await saveParsedDocument(
    supabase,
    params.documentId,
    params.userId,
    parsedData,
    "complete",
    aiConfidence
  );

  return refreshDocumentsAndCrossValidate(
    supabase,
    params.jobId,
    params.userId,
    params.documents
  );
}

export async function triggerDocumentParsing(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    documentType: string;
    jobId: string;
    userId: string;
    documents: JobDocument[];
    profile?: UserProfile | null;
    poorQuality?: boolean;
  }
): Promise<ParseResult> {
  if (!isParseableDocType(params.documentType)) {
    return { status: "skipped", reason: "unsupported_type" };
  }

  const docType = params.documentType;

  await supabase
    .from("documents")
    .update({ parsing_status: "parsing", parse_error: null })
    .eq("id", params.documentId)
    .eq("user_id", params.userId);

  if (params.poorQuality) {
    await applyLayer1PoorQuality(supabase, {
      documentId: params.documentId,
      documentType: docType,
      userId: params.userId,
    });
    return { status: "skipped", reason: "poor_quality" };
  }

  const result = await invokeParseEdgeFunction(supabase, params.documentId);

  if (result.ok === false) {
    if (result.rateLimited) {
      await supabase
        .from("documents")
        .update({
          parsing_status: "skipped",
          parse_error: "rate_limited",
          ai_confidence: "unread",
        })
        .eq("id", params.documentId)
        .eq("user_id", params.userId);
      return { status: "rate_limited" };
    }

    await supabase
      .from("documents")
      .update({
        parsing_status: "failed",
        parse_error: result.error ?? "parse_failed",
        ai_confidence: "unread",
      })
      .eq("id", params.documentId)
      .eq("user_id", params.userId);

    return {
      status: "failed",
      message: GENERIC_PARSE_ERROR,
      retryable: true,
    };
  }

  await processParsedResult(supabase, {
    documentId: params.documentId,
    documentType: docType,
    rawParsed: result.parsed,
    jobId: params.jobId,
    userId: params.userId,
    documents: params.documents,
  });

  return { status: "complete", documentId: params.documentId };
}

export async function retryDocumentParsing(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    documentType: string;
    jobId: string;
    userId: string;
    documents: JobDocument[];
    profile?: UserProfile | null;
  }
): Promise<ParseResult> {
  return triggerDocumentParsing(supabase, { ...params, poorQuality: false });
}

export function isDocumentParsing(doc: JobDocument | undefined): boolean {
  return doc?.parsing_status === "parsing" || doc?.parsing_status === "pending";
}

export function needsAiReview(
  job: Job | null,
  documents: JobDocument[]
): boolean {
  if (!job || job.ai_fields_confirmed) return false;
  return buildJobReviewFields(job, documents).length > 0;
}

export function hasPendingAiForInvoice(
  job: Job | null,
  documents: JobDocument[]
): boolean {
  if (!job) return false;
  if (job.ai_fields_confirmed) return false;
  return documents.some(
    (doc) =>
      isParseableDocType(doc.document_type) &&
      doc.parsing_status === "complete" &&
      Boolean(doc.parsed_data) &&
      doc.ai_confidence !== "manual"
  );
}

export async function confirmAiFields(
  supabase: SupabaseClient,
  params: {
    jobId: string;
    userId: string;
    job: Job;
    profile?: UserProfile | null;
    fieldValues?: Partial<Job>;
  }
): Promise<void> {
  const updates: Partial<Job> = {
    ai_fields_confirmed: true,
    cross_validation_conflicts: null,
    updated_at: new Date().toISOString(),
    ...params.fieldValues,
  };

  const mergedBrokerName = normalizeBrokerName(
    updates.broker_name ?? params.job.broker_name
  );
  const mergedBrokerId = updates.broker_id ?? params.job.broker_id ?? null;

  if (mergedBrokerName) {
    const linked = await ensureJobBrokerLink(mergedBrokerName, mergedBrokerId);
    updates.broker_name = linked.brokerName;
    updates.broker_id = linked.brokerId;
  } else if (updates.broker_name !== undefined) {
    updates.broker_name = null;
    updates.broker_id = null;
  }

  await supabase.from("jobs").update(updates).eq("id", params.jobId).eq("user_id", params.userId);

  const mergedJob = { ...params.job, ...updates };
  if (mergedJob.miles && mergedJob.miles > 0) {
    await updateJobProfitability(
      supabase,
      {
        id: params.jobId,
        load_value: mergedJob.load_value,
        miles: mergedJob.miles,
      },
      params.userId,
      params.profile
    );
  }
}

export { buildJobReviewFields as getReviewFields };

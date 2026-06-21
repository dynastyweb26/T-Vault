import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadJobDocument } from "@/lib/job-folder/upload";
import type { AiConfidence } from "@/types/jobs";
import type { RateConParsedData } from "@/lib/job-folder/ai-types";

export async function attachScannedRateCon(
  supabase: SupabaseClient,
  params: {
    userId: string;
    jobId: string;
    file: File;
    parsedData: RateConParsedData;
    aiConfidence: AiConfidence;
  }
): Promise<void> {
  const { documentId } = await uploadJobDocument(supabase, {
    userId: params.userId,
    jobId: params.jobId,
    documentType: "rate_confirmation",
    file: params.file,
    skipQualityCheck: true,
  });

  await supabase
    .from("documents")
    .update({
      parsed_data: params.parsedData,
      parsing_status: "complete",
      ai_confidence: params.aiConfidence,
      parse_error: null,
    })
    .eq("id", documentId)
    .eq("user_id", params.userId);
}

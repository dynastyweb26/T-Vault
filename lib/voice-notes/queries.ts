import type { SupabaseClient } from "@supabase/supabase-js";
import type { VoiceNote, VoiceNoteResult } from "@/types/database";

const STORAGE_BUCKET = "game1-documents";

export async function createVoiceNoteRecord(
  supabase: SupabaseClient,
  userId: string,
  audioPath: string
): Promise<VoiceNote | null> {
  const { data, error } = await supabase
    .from("voice_notes")
    .insert({
      user_id: userId,
      audio_path: audioPath,
      category: "general",
    })
    .select("*")
    .single();

  if (error) {
    console.error("voice note insert failed:", error.message);
    return null;
  }
  return data as VoiceNote;
}

export async function uploadVoiceAudio(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob
): Promise<string | null> {
  const path = `${userId}/voice/${Date.now()}.webm`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: "audio/webm",
      upsert: false,
    });

  if (error) {
    console.error("voice upload failed:", error.message);
    return null;
  }
  return path;
}

export async function processVoiceNote(
  supabase: SupabaseClient,
  voiceNoteId: string,
  storagePath: string
): Promise<VoiceNoteResult | { rateLimited: true } | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/process-voice-note`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ voiceNoteId, storagePath }),
    }
  );

  if (response.status === 429) {
    return { rateLimited: true };
  }

  if (!response.ok) return null;

  const result = await response.json();
  return result as VoiceNoteResult;
}

export async function fetchVoiceNotes(
  supabase: SupabaseClient,
  userId: string,
  includeProcessed = false
): Promise<VoiceNote[]> {
  let query = supabase
    .from("voice_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeProcessed) {
    query = query.eq("processed", false);
  }

  const { data } = await query;
  return (data as VoiceNote[]) ?? [];
}

export async function markVoiceNoteProcessed(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  jobId?: string | null
): Promise<void> {
  await supabase
    .from("voice_notes")
    .update({
      processed: true,
      job_id: jobId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("user_id", userId);
}

export async function deleteVoiceNote(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<void> {
  const { data: note } = await supabase
    .from("voice_notes")
    .select("audio_path")
    .eq("id", noteId)
    .eq("user_id", userId)
    .single();

  if (note?.audio_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([note.audio_path]);
  }

  await supabase
    .from("voice_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

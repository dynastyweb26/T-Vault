import type { SupabaseClient } from "@supabase/supabase-js";
import type { VoiceNote, VoiceNoteResult } from "@/types/database";
import { VOICE_NOTES_ENABLED } from "@/lib/features";
import {
  decodeVoiceNoteCursor,
  DEFAULT_PAGE_SIZE,
  encodeVoiceNoteCursor,
} from "@/lib/pagination/cursor";

const STORAGE_BUCKET = "game1-documents";

export const VOICE_NOTES_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export interface FetchVoiceNotesPageOptions {
  cursor?: string | null;
  limit?: number;
  includeProcessed?: boolean;
}

export interface VoiceNotesPageResult {
  notes: VoiceNote[];
  nextCursor: string | null;
}

export async function createVoiceNoteRecord(
  supabase: SupabaseClient,
  userId: string,
  audioPath: string
): Promise<VoiceNote | null> {
  if (!VOICE_NOTES_ENABLED) return null;

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
  if (!VOICE_NOTES_ENABLED) return null;

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
  if (!VOICE_NOTES_ENABLED) return null;

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

export async function fetchVoiceNotesPage(
  supabase: SupabaseClient,
  userId: string,
  options: FetchVoiceNotesPageOptions = {}
): Promise<VoiceNotesPageResult> {
  if (!VOICE_NOTES_ENABLED) {
    return { notes: [], nextCursor: null };
  }

  const limit = options.limit ?? VOICE_NOTES_PAGE_SIZE;
  const includeProcessed = options.includeProcessed ?? false;

  let query = supabase
    .from("voice_notes")
    .select("*")
    .eq("user_id", userId);

  if (!includeProcessed) {
    query = query.eq("processed", false);
  }

  if (options.cursor) {
    const decoded = decodeVoiceNoteCursor(options.cursor);
    if (decoded) {
      query = query.or(
        `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
      );
    }
  }

  query = query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    console.error("voice notes fetch failed:", error.message);
    return { notes: [], nextCursor: null };
  }

  const rows = (data ?? []) as VoiceNote[];
  const hasMore = rows.length > limit;
  const notes = hasMore ? rows.slice(0, limit) : rows;
  const last = notes[notes.length - 1];
  const nextCursor =
    hasMore && last?.created_at
      ? encodeVoiceNoteCursor(last.created_at, last.id)
      : null;

  return { notes, nextCursor };
}

/** @deprecated Use fetchVoiceNotesPage for paginated access */
export async function fetchVoiceNotes(
  supabase: SupabaseClient,
  userId: string,
  includeProcessed = false
): Promise<VoiceNote[]> {
  const { notes } = await fetchVoiceNotesPage(supabase, userId, {
    includeProcessed,
    limit: 1000,
  });
  return notes;
}

export async function markVoiceNoteProcessed(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  jobId?: string | null
): Promise<void> {
  if (!VOICE_NOTES_ENABLED) return;

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
  if (!VOICE_NOTES_ENABLED) return;

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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import {
  createVoiceNoteRecord,
  formatDuration,
  processVoiceNote,
  uploadVoiceAudio,
} from "@/lib/voice-notes/queries";
import { isOnline, saveVoiceDraft, clearVoiceDraft } from "@/lib/offline/queue";
import type { VoiceNoteResult } from "@/types/database";
import { triggerHaptic } from "@/lib/haptics";

type RecordingState = "idle" | "recording" | "processing" | "result";

export function VoiceNoteView() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<RecordingState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<VoiceNoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceNoteId, setVoiceNoteId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        saveVoiceDraft(blob);

        if (!isOnline()) {
          setState("result");
          setResult({
            transcript: "Saved offline — will transcribe when back online.",
            category: "general",
            suggested_action: "note_only",
            extracted_amount: null,
            extracted_category: null,
            extracted_description: "",
          });
          return;
        }

        setState("processing");
        const supabase = createClient();
        const path = await uploadVoiceAudio(supabase, user.id, blob);
        if (!path) {
          setError("Could not save recording. Try again.");
          setState("idle");
          return;
        }

        const note = await createVoiceNoteRecord(supabase, user.id, path);
        if (!note) {
          setError("Could not save recording. Try again.");
          setState("idle");
          return;
        }

        setVoiceNoteId(note.id);
        setStoragePath(path);

        const processed = await processVoiceNote(supabase, note.id, path);
        if (!processed) {
          setError("Transcription failed. Try again.");
          setState("idle");
          return;
        }
        if ("rateLimited" in processed && processed.rateLimited) {
          setError("Too many requests. Try again later.");
          setState("idle");
          return;
        }

        clearVoiceDraft();
        setResult(processed as VoiceNoteResult);
        setState("result");
        triggerHaptic("medium");
      };

      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied.");
    }
  }, [user]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  useEffect(() => {
    if (state === "idle") {
      startRecording();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startRecording, state]);

  const handleExpense = (edit = false) => {
    if (!result) return;
    const params = new URLSearchParams({
      amount: String(result.extracted_amount ?? ""),
      category: result.extracted_category ?? "other",
      description: result.extracted_description ?? result.transcript,
      ...(edit ? { edit: "1" } : {}),
    });
    router.push(`${APP_ROUTES.expenses}?${params.toString()}`);
  };

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-between px-5 py-8">
      {state === "recording" ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div
              className="tv-voice-pulse size-20 rounded-full bg-[var(--color-danger)]"
              aria-hidden
            />
            <p className="tv-key-number text-[var(--color-text-primary)]">
              {formatDuration(seconds)}
            </p>
            <p className="text-center text-[14px] text-[var(--color-text-muted)]">
              Say anything — expense, note, reminder
            </p>
          </div>
          <TvButton className="h-16 w-full max-w-xs" onClick={stopRecording}>
            Stop Recording
          </TvButton>
        </>
      ) : null}

      {state === "processing" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2
            className="size-10 animate-spin text-[var(--color-warning)]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-[17px] text-[var(--color-warning-text)]">
            Transcribing...
          </p>
        </div>
      ) : null}

      {state === "result" && result ? (
        <div className="flex w-full flex-1 flex-col gap-4">
          {result.category === "expense" && result.extracted_amount ? (
            <div className="rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] p-4">
              <p className="tv-label text-[var(--color-success-text)]">
                Expense detected
              </p>
              <p className="tv-tabular mt-2 text-[24px] font-bold text-[var(--color-text-primary)]">
                ${result.extracted_amount.toFixed(2)}
              </p>
              <p className="mt-1 text-[var(--color-text-secondary)]">
                {result.extracted_category ?? "other"} —{" "}
                {result.extracted_description}
              </p>
              <TvButton className="mt-4" onClick={() => handleExpense(false)}>
                Add This Expense
              </TvButton>
              <TvButton
                variant="secondary"
                className="mt-2"
                onClick={() => handleExpense(true)}
              >
                Edit First
              </TvButton>
              <button
                type="button"
                className="mt-3 w-full text-center text-[16px] text-[var(--color-text-muted)]"
                onClick={() => router.push(APP_ROUTES.voiceNotes)}
              >
                Save Note Only
              </button>
            </div>
          ) : (
            <div className="rounded-2xl tv-glass-card p-4">
              <p className="tv-label">Note saved</p>
              <p className="tv-body mt-2 max-h-48 overflow-y-auto">
                {result.transcript}
              </p>
              <button
                type="button"
                className="mt-4 w-full text-center text-[16px] text-[var(--color-text-muted)]"
                onClick={() => router.push(APP_ROUTES.voiceNotes)}
              >
                Save as standalone note
              </button>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <TvButton
              variant="secondary"
              onClick={() => {
                setState("idle");
                setResult(null);
              }}
            >
              Re-record
            </TvButton>
            <button
              type="button"
              className="h-14 text-[16px] text-[var(--color-text-muted)]"
              onClick={() => router.push(APP_ROUTES.dashboard)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="tv-error-state mt-4 w-full text-[15px]">{error}</p>
      ) : null}

      {state === "idle" && !error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Mic
            className="size-12 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-[var(--color-text-muted)]">Starting recorder...</p>
        </div>
      ) : null}
    </div>
  );
}

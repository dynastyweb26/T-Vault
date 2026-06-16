"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  deleteVoiceNote,
  fetchVoiceNotes,
  markVoiceNoteProcessed,
} from "@/lib/voice-notes/queries";
import type { VoiceNote } from "@/types/database";
import { APP_ROUTES } from "@/lib/constants";
import { TvButton } from "@/components/tv/tv-button";

function NoteRow({
  note,
  onRefresh,
}: {
  note: VoiceNote;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const preview = (note.transcript ?? "").slice(0, 80);
  const date = new Date(note.created_at).toLocaleString();

  const handleDelete = async () => {
    if (!user) return;
    const supabase = createClient();
    await deleteVoiceNote(supabase, user.id, note.id);
    onRefresh();
  };

  const handleExpense = () => {
    const params = new URLSearchParams({
      amount: String(note.extracted_amount ?? ""),
      category: note.extracted_category ?? "other",
      description: note.extracted_description ?? note.transcript ?? "",
    });
    window.location.href = `${APP_ROUTES.expenses}?${params.toString()}`;
  };

  return (
    <article className="tv-glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="tv-caption">{date}</p>
          <p className="tv-body mt-1 text-[16px]">{preview}</p>
          <span
            className={`tv-chip mt-2 inline-block rounded-full px-2 py-0.5 text-[12px] ${
              note.category === "expense"
                ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                : "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]"
            }`}
          >
            {note.category}
          </span>
        </div>
        <button
          type="button"
          aria-label="Delete note"
          onClick={handleDelete}
          className="tv-icon-btn text-[var(--color-danger-text)]"
        >
          <Trash2 className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.category === "expense" ? (
          <button
            type="button"
            className="tv-accent-outline-btn"
            onClick={handleExpense}
          >
            Add to Expenses
          </button>
        ) : null}
        <button
          type="button"
          className="tv-outline-btn"
          onClick={async () => {
            if (!user) return;
            const supabase = createClient();
            await markVoiceNoteProcessed(supabase, user.id, note.id);
            onRefresh();
          }}
        >
          Mark processed
        </button>
      </div>
    </article>
  );
}

export function VoiceNotesHistoryView() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const data = await fetchVoiceNotes(supabase, user.id, showArchived);
    setNotes(data);
    setLoading(false);
  }, [showArchived, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <AppHeader title="Voice Notes" />
        <div className="mt-6 flex flex-col gap-3 px-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="tv-skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </>
    );
  }

  if (!notes.length) {
    return (
      <>
        <AppHeader title="Voice Notes" />
        <div className="mt-6 px-5">
          <div className="tv-empty-state">
            <Mic
              className="size-12 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
            <p className="tv-card-title mt-4">
              Tap the mic to log anything hands-free
            </p>
            <Link href={APP_ROUTES.voiceNote} className="mt-4">
              <TvButton>Record Voice Note</TvButton>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Voice Notes" subtitle="Unprocessed notes" />
      <div className="mt-6 flex flex-col gap-3 px-5 pb-8">
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} onRefresh={load} />
        ))}
        <button
          type="button"
          className="mt-2 text-center text-[16px] text-[var(--color-accent)]"
          onClick={() => {
            setShowArchived(!showArchived);
            setLoading(true);
          }}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
      </div>
    </>
  );
}

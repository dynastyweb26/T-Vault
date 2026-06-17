"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  purgeJob,
  restoreJob,
  softDeleteJob,
} from "@/lib/loads/soft-delete";
import { notifyJobsChanged } from "@/lib/loads/job-events";
import { cn } from "@/lib/utils";

const UNDO_WINDOW_MS = 6500;

interface PendingDelete {
  jobId: string;
  jobName: string;
}

interface DeleteUndoContextValue {
  deleteJobWithUndo: (
    jobId: string,
    jobName: string
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
}

const DeleteUndoContext = createContext<DeleteUndoContextValue | undefined>(
  undefined
);

export function DeleteUndoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const purgeTimerRef = useRef<number | null>(null);

  const clearPurgeTimer = useCallback(() => {
    if (purgeTimerRef.current !== null) {
      window.clearTimeout(purgeTimerRef.current);
      purgeTimerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearPurgeTimer();
    setPending(null);
  }, [clearPurgeTimer]);

  const schedulePurge = useCallback(
    (jobId: string) => {
      clearPurgeTimer();
      purgeTimerRef.current = window.setTimeout(async () => {
        if (!user) return;
        const supabase = createClient();
        await purgeJob(supabase, user.id, jobId);
        setPending((current) => (current?.jobId === jobId ? null : current));
        purgeTimerRef.current = null;
      }, UNDO_WINDOW_MS);
    },
    [clearPurgeTimer, user]
  );

  const deleteJobWithUndo = useCallback(
    async (jobId: string, jobName: string) => {
      if (!user) {
        return { ok: false as const, message: "Sign in to delete loads." };
      }

      const supabase = createClient();
      const result = await softDeleteJob(supabase, user.id, jobId);
      if (!result.ok) return result;

      dismissToast();
      setPending({ jobId, jobName });
      notifyJobsChanged();
      schedulePurge(jobId);

      return { ok: true as const };
    },
    [dismissToast, schedulePurge, user]
  );

  const undoDelete = useCallback(async () => {
    if (!pending || !user) return;

    const { jobId } = pending;
    clearPurgeTimer();
    setPending(null);

    const supabase = createClient();
    const result = await restoreJob(supabase, user.id, jobId);
    if (result.ok) {
      notifyJobsChanged();
    }
  }, [clearPurgeTimer, pending, user]);

  useEffect(() => {
    return () => clearPurgeTimer();
  }, [clearPurgeTimer]);

  return (
    <DeleteUndoContext.Provider value={{ deleteJobWithUndo }}>
      {children}
      {pending ? (
        <div
          className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              "tv-glass-card flex w-full max-w-lg items-center justify-between gap-3",
              "rounded-2xl border border-[var(--color-accent)]/30 px-4 py-3 shadow-[var(--shadow-gold-strong)]"
            )}
          >
            <p className="text-[14px] text-[var(--color-text-primary)]">
              <span className="font-medium">{pending.jobName}</span> deleted
            </p>
            <button
              type="button"
              onClick={() => void undoDelete()}
              className="shrink-0 rounded-full border border-[var(--color-accent)] px-4 py-1.5 text-[14px] font-semibold text-[var(--color-accent)]"
            >
              Undo
            </button>
          </div>
        </div>
      ) : null}
    </DeleteUndoContext.Provider>
  );
}

export function useDeleteUndo() {
  const ctx = useContext(DeleteUndoContext);
  if (!ctx) {
    throw new Error("useDeleteUndo must be used within DeleteUndoProvider");
  }
  return ctx;
}

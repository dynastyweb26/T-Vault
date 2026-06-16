"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import type { DetentionSession } from "@/types/job-folder";
import type { Expense, Job, JobDocument } from "@/types/jobs";

export function useJobFolder(jobId: string) {
  const { user, refreshProfile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [detentionSessions, setDetentionSessions] = useState<DetentionSession[]>([]);
  const [activeSession, setActiveSession] = useState<DetentionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !jobId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const [jobRes, docsRes, expRes, detRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", user.id).single(),
      supabase.from("documents").select("*").eq("job_id", jobId).eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("job_id", jobId).eq("user_id", user.id),
      supabase
        .from("detention_sessions")
        .select("*")
        .eq("job_id", jobId)
        .eq("user_id", user.id)
        .order("timer_start", { ascending: false }),
    ]);

    if (jobRes.error || !jobRes.data) {
      setError("Load not found.");
      setLoading(false);
      return;
    }

    setJob(jobRes.data as Job);
    setDocuments((docsRes.data ?? []) as JobDocument[]);
    setExpenses((expRes.data ?? []) as Expense[]);
    const sessions = (detRes.data ?? []) as DetentionSession[];
    setDetentionSessions(sessions);
    setActiveSession(sessions.find((s) => !s.timer_end) ?? null);
    setLoading(false);
  }, [jobId, user]);

  const refreshQuiet = useCallback(async () => {
    if (!user || !jobId) return;

    const supabase = createClient();
    const [jobRes, docsRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", user.id).single(),
      supabase.from("documents").select("*").eq("job_id", jobId).eq("user_id", user.id),
    ]);

    if (jobRes.data) setJob(jobRes.data as Job);
    setDocuments((docsRes.data ?? []) as JobDocument[]);
  }, [jobId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateJob = useCallback(
    async (updates: Partial<Job>) => {
      if (!user || !jobId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("jobs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", jobId)
        .select("*")
        .single();
      if (data) setJob(data as Job);
      await refreshProfile();
    },
    [jobId, refreshProfile, user]
  );

  return {
    job,
    documents,
    expenses,
    detentionSessions,
    activeSession,
    loading,
    error,
    refresh,
    refreshQuiet,
    updateJob,
    setJob,
    setDocuments,
    setExpenses,
    setActiveSession,
    setDetentionSessions,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import type { DetentionSession } from "@/types/job-folder";
import type { Expense, Job, JobDocument } from "@/types/jobs";

function resolveActiveSession(
  job: Job | null,
  sessions: DetentionSession[]
): DetentionSession | null {
  const openSession = sessions.find((session) => !session.timer_end) ?? null;

  if (job?.detention_start_time) {
    if (openSession) return openSession;

    return {
      id: `job-${job.id}`,
      user_id: job.user_id,
      job_id: job.id,
      location_type: job.detention_location_type ?? "pickup",
      timer_start: job.detention_start_time,
      timer_end: null,
      total_minutes: null,
      amount_owed: null,
      detention_invoice_url: null,
      paid: null,
      created_at: null,
    };
  }

  return openSession;
}

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
      supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single(),
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

    const nextJob = jobRes.data as Job;
    const sessions = (detRes.data ?? []) as DetentionSession[];

    setJob(nextJob);
    setDocuments((docsRes.data ?? []) as JobDocument[]);
    setExpenses((expRes.data ?? []) as Expense[]);
    setDetentionSessions(sessions);
    setActiveSession(resolveActiveSession(nextJob, sessions));
    setLoading(false);
  }, [jobId, user]);

  const refreshQuiet = useCallback(async () => {
    if (!user || !jobId) return;

    const supabase = createClient();
    const [jobRes, docsRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single(),
      supabase.from("documents").select("*").eq("job_id", jobId).eq("user_id", user.id),
    ]);

    if (jobRes.data) {
      const nextJob = jobRes.data as Job;
      setJob(nextJob);
      setActiveSession((current) => resolveActiveSession(nextJob, detentionSessions));
    }
    setDocuments((docsRes.data ?? []) as JobDocument[]);
  }, [detentionSessions, jobId, user]);

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
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (data) {
        const nextJob = data as Job;
        setJob(nextJob);
        setActiveSession(resolveActiveSession(nextJob, detentionSessions));
      }
      await refreshProfile();
    },
    [detentionSessions, jobId, refreshProfile, user]
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

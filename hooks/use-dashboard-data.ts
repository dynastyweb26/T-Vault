"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDashboardData } from "@/lib/dashboard/queries";
import { useAuth } from "@/components/providers/auth-provider";
import { onJobsChanged } from "@/lib/loads/job-events";
import type { DashboardData } from "@/types/jobs";

export function useDashboardData() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const supabase = createClient();
        const dashboard = await fetchDashboardData(supabase, user.id, profile);
        setData(dashboard);
        setError(null);
      } catch {
        setError(
          "We could not load your dashboard. Pull down to refresh and try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile, user]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return onJobsChanged(() => {
      void load(true);
    });
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchExpensesPageData,
  type ExpensesPageData,
} from "@/lib/expenses/queries";

export function useExpenses() {
  const { user } = useAuth();
  const [data, setData] = useState<ExpensesPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setData(null);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const supabase = createClient();
        const next = await fetchExpensesPageData(supabase, user.id);
        setData(next);
      } catch {
        setError("Could not load expenses. Pull to refresh and try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  };
}

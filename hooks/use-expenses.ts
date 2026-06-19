"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchExpensesSummary,
  fetchTruckExpensesPage,
  type ExpenseSummary,
} from "@/lib/expenses/queries";
import type { Expense } from "@/types/jobs";

export function useExpenses() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [truckExpenses, setTruckExpenses] = useState<Expense[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setSummary(null);
        setTruckExpenses([]);
        setNextCursor(null);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const supabase = createClient();
        const [summaryResult, pageResult] = await Promise.all([
          fetchExpensesSummary(supabase, user.id),
          fetchTruckExpensesPage(supabase, user.id),
        ]);

        setSummary(summaryResult);
        setTruckExpenses(pageResult.expenses);
        setNextCursor(pageResult.nextCursor);
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
    void loadInitial();
  }, [loadInitial]);

  const refresh = useCallback(async () => {
    await loadInitial(true);
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!user || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const supabase = createClient();
      const pageResult = await fetchTruckExpensesPage(supabase, user.id, {
        cursor: nextCursor,
      });

      setTruckExpenses((current) => [...current, ...pageResult.expenses]);
      setNextCursor(pageResult.nextCursor);
    } catch {
      setError("Could not load more expenses. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, user]);

  return {
    summary,
    truckExpenses,
    nextCursor,
    hasMore: nextCursor !== null,
    loading,
    loadingMore,
    refreshing,
    error,
    refresh,
    loadMore,
  };
}

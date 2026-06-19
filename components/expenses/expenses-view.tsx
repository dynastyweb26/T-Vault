"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { ExpenseSummaryCard } from "@/components/expenses/expense-summary-card";
import { ExpenseFilterTabs } from "@/components/expenses/expense-filter-tabs";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { AddTruckExpenseSheet } from "@/components/expenses/add-truck-expense-sheet";
import { ExpenseReceiptPreview } from "@/components/expenses/expense-receipt-preview";
import { useExpenses } from "@/hooks/use-expenses";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useAppTour } from "@/components/providers/app-tour-provider";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { deleteTruckExpense } from "@/lib/expenses/queries";
import {
  matchesExpenseFilter,
  type ExpenseFilterId,
} from "@/lib/expenses/constants";
import type { Expense } from "@/types/jobs";

function ExpenseListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="tv-skeleton h-16 rounded-2xl"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ExpensesView() {
  const { user } = useAuth();
  const { expenseSheetOpen, isRunning } = useAppTour();
  const searchParams = useSearchParams();
  const { summary, truckExpenses, hasMore, loading, loadingMore, refreshing, error, refresh, loadMore } =
    useExpenses();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ExpenseFilterId>("all");
  const [previewExpense, setPreviewExpense] = useState<Expense | null>(null);
  const [recentExpenseId, setRecentExpenseId] = useState<string | null>(null);

  const prefillAmount = searchParams.get("amount") ?? "";
  const prefillCategory = (searchParams.get("category") ??
    "fuel") as import("@/lib/expenses/constants").TruckExpenseCategoryId;
  const prefillDescription = searchParams.get("description") ?? "";

  useEffect(() => {
    if (prefillAmount || prefillDescription) {
      setSheetOpen(true);
    }
  }, [prefillAmount, prefillDescription]);

  useEffect(() => {
    if (isRunning) {
      setSheetOpen(expenseSheetOpen);
    }
  }, [expenseSheetOpen, isRunning]);

  const {
    containerRef,
    contentRef,
    indicatorRef,
    refreshing: pullRefreshing,
    handlers,
  } = usePullToRefresh(async () => {
    await refresh();
  });

  const filteredExpenses = useMemo(() => {
    return truckExpenses.filter((expense) =>
      matchesExpenseFilter(expense.category, activeFilter)
    );
  }, [activeFilter, truckExpenses]);

  const handleDelete = async (expenseId: string) => {
    if (!user) return;
    const supabase = createClient();
    try {
      await deleteTruckExpense(supabase, user.id, expenseId);
      if (recentExpenseId === expenseId) setRecentExpenseId(null);
      await refresh();
    } catch {
      window.alert("Could not delete expense. Try again.");
    }
  };

  return (
    <>
      <div ref={containerRef} {...handlers} className="flex flex-col">
        <p
          ref={indicatorRef}
          className="tv-pull-indicator px-5 py-2 text-center text-[13px] text-[var(--color-text-muted)]"
          style={{
            display: pullRefreshing || refreshing ? "block" : undefined,
          }}
        >
          {pullRefreshing || refreshing ? "Refreshing..." : "Pull to refresh"}
        </p>

        <div ref={contentRef} className="tv-pull-content flex flex-col gap-4 px-5">

        {loading ? (
          <>
            <div className="tv-skeleton h-36 rounded-2xl" aria-hidden />
            <ExpenseListSkeleton />
          </>
        ) : error ? (
          <div className="tv-error-state">
            <p className="tv-body text-[15px]">{error}</p>
          </div>
        ) : summary ? (
          <>
            <div data-tour="expenses-summary" className="flex flex-col gap-4">
              <ExpenseSummaryCard summary={summary} />

              <TvButton onClick={() => setSheetOpen(true)}>
                <Plus className="size-5" strokeWidth={2} aria-hidden />
                Add Truck Expense
              </TvButton>
            </div>

            <ExpenseFilterTabs
              active={activeFilter}
              onChange={setActiveFilter}
            />

            {filteredExpenses.length > 0 ? (
              <div className="space-y-2 pb-8">
                {filteredExpenses.map((expense, index) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    animate={expense.id === recentExpenseId}
                    onDelete={handleDelete}
                    onViewReceipt={setPreviewExpense}
                    tourTarget={index === 0}
                  />
                ))}
                {hasMore ? (
                  <TvButton
                    variant="secondary"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    className="mt-2 w-full"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </TvButton>
                ) : null}
              </div>
            ) : (
              <section className="tv-empty-state mt-6 pb-8" data-tour="expenses-row">
                <Receipt
                  className="size-12 text-[var(--color-accent)]"
                  strokeWidth={2}
                  aria-hidden
                />
                <h2 className="tv-card-title mt-4">No truck expenses yet</h2>
                <p className="tv-body mt-2 max-w-xs text-[var(--color-text-secondary)]">
                  Track insurance, fuel, payments, and other truck costs here.
                  Per-load expenses stay inside each job folder.
                </p>
                <TvButton className="mt-6" onClick={() => setSheetOpen(true)}>
                  Add Truck Expense
                </TvButton>
              </section>
            )}
          </>
        ) : null}
        </div>
      </div>

      <AddTruckExpenseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initialAmount={prefillAmount}
        initialCategory={prefillCategory}
        initialDescription={prefillDescription}
        onSaved={(expenseId) => {
          setRecentExpenseId(expenseId);
          void refresh();
        }}
      />

      <ExpenseReceiptPreview
        expense={previewExpense}
        onClose={() => setPreviewExpense(null)}
      />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { ExpenseSummaryCard } from "@/components/expenses/expense-summary-card";
import { ExpenseFilterTabs } from "@/components/expenses/expense-filter-tabs";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { AddTruckExpenseSheet } from "@/components/expenses/add-truck-expense-sheet";
import { ExpenseReceiptPreview } from "@/components/expenses/expense-receipt-preview";
import { useExpenses } from "@/hooks/use-expenses";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
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
  const { data, loading, refreshing, error, refresh } = useExpenses();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ExpenseFilterId>("all");
  const [previewExpense, setPreviewExpense] = useState<Expense | null>(null);
  const [recentExpenseId, setRecentExpenseId] = useState<string | null>(null);

  const { containerRef, pullDistance, handlers } = usePullToRefresh(async () => {
    await refresh();
  });

  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    return data.truckExpenses.filter((expense) =>
      matchesExpenseFilter(expense.category, activeFilter)
    );
  }, [activeFilter, data]);

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
      <div
        ref={containerRef}
        {...handlers}
        className="flex flex-col gap-4 px-5"
      >
        {pullDistance > 0 || refreshing ? (
          <p className="text-center text-[13px] text-[var(--color-text-muted)]">
            {refreshing ? "Refreshing..." : "Pull to refresh"}
          </p>
        ) : null}

        {loading ? (
          <>
            <div className="tv-skeleton h-36 rounded-2xl" aria-hidden />
            <ExpenseListSkeleton />
          </>
        ) : error ? (
          <div className="tv-error-state">
            <p className="tv-body text-[15px]">{error}</p>
          </div>
        ) : data ? (
          <>
            <ExpenseSummaryCard summary={data.summary} />

            <TvButton onClick={() => setSheetOpen(true)}>
              <Plus className="size-5" strokeWidth={2} aria-hidden />
              Add Truck Expense
            </TvButton>

            <ExpenseFilterTabs
              active={activeFilter}
              onChange={setActiveFilter}
            />

            {filteredExpenses.length > 0 ? (
              <div className="space-y-2 pb-8">
                {filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    animate={expense.id === recentExpenseId}
                    onDelete={handleDelete}
                    onViewReceipt={setPreviewExpense}
                  />
                ))}
              </div>
            ) : (
              <section className="tv-empty-state mt-6 pb-8">
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

      <AddTruckExpenseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
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

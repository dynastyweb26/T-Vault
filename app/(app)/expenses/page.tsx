"use client";

import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { QuickExpenseSheet } from "@/components/dashboard/quick-expense-sheet";

export default function ExpensesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const openAddExpense = () => setSheetOpen(true);

  return (
    <>
      <AppHeader title="Expenses" subtitle="Track every dollar out" />

      <div className="px-5">
        <TvButton className="mt-2" onClick={openAddExpense}>
          <Plus className="size-5" strokeWidth={2} aria-hidden />
          Add Expense
        </TvButton>
      </div>

      <section className="tv-empty-state mx-5 mt-10">
        <Receipt
          className="size-12 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="tv-card-title mt-4">No expenses yet</h2>
        <p className="mt-2 max-w-xs text-[16px] text-[var(--color-text-secondary)]">
          Add fuel, tolls, maintenance, and other truck costs here.
        </p>
      </section>

      <button
        type="button"
        aria-label="Add expense"
        onClick={openAddExpense}
        className="tv-brushed-gold-btn tv-pressable fixed bottom-24 right-4 z-40 flex size-16 items-center justify-center rounded-full transition-transform duration-150 active:scale-[0.97]"
      >
        <Plus className="size-8 text-white" strokeWidth={2.5} aria-hidden />
      </button>

      <QuickExpenseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

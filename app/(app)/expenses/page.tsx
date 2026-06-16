"use client";

import { Receipt } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";

export default function ExpensesPage() {
  return (
    <>
      <AppHeader title="Expenses" subtitle="Track every dollar out" />
      <section className="mt-10 flex flex-col items-center rounded-[var(--radius-card)] bg-[var(--color-surface)] px-6 py-10 text-center">
        <Receipt
          className="size-12 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="tv-card-title mt-4">No expenses yet</h2>
        <p className="mt-2 max-w-xs text-[16px] text-[var(--color-text-secondary)]">
          Fuel, tolls, and repairs will be tracked here in a later phase.
        </p>
      </section>
    </>
  );
}

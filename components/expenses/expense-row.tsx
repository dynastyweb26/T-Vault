"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { AlertCircle, FileText, Trash2 } from "lucide-react";
import { formatCurrencyDetailed, formatShortDate } from "@/lib/dashboard/format";
import { getCategoryMeta } from "@/lib/expenses/constants";
import { useSwipeToReveal } from "@/hooks/use-swipe-to-reveal";
import type { Expense } from "@/types/jobs";

interface ExpenseRowProps {
  expense: Expense;
  animate?: boolean;
  onDelete: (expenseId: string) => void;
  onViewReceipt: (expense: Expense) => void;
  tourTarget?: boolean;
}

export const ExpenseRow = memo(function ExpenseRow({
  expense,
  animate = false,
  onDelete,
  onViewReceipt,
  tourTarget = false,
}: ExpenseRowProps) {
  const { surfaceRef, handlers, reset } = useSwipeToReveal({
    maxOffset: 80,
    snapThreshold: 0.5,
  });
  const category = getCategoryMeta(expense.category);
  const Icon = category.icon;
  const hasReceipt = Boolean(expense.receipt_url);
  const hasNoReceiptNote = Boolean(expense.no_receipt_reason?.trim());

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Delete this truck expense? This cannot be undone."
    );
    if (!confirmed) {
      reset();
      return;
    }
    onDelete(expense.id);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      {...(tourTarget ? { "data-tour": "expenses-row" } : {})}
    >
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={handleDelete}
          className="flex w-20 items-center justify-center bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
          aria-label="Delete expense"
        >
          <Trash2 className="size-5" strokeWidth={2} />
        </button>
      </div>

      <div
        ref={surfaceRef}
        className={`tv-swipe-surface tv-glass-card relative flex min-h-16 items-center gap-3 border border-[var(--color-shell-border)] px-4 ${
          animate ? "tv-expense-row-enter" : ""
        }`}
        {...handlers}
      >
        <Icon
          className="size-6 shrink-0 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <p className="font-semibold">{category.label}</p>
          <p className="truncate text-[13px] text-[var(--color-text-muted)]">
            {expense.description?.trim() || "—"}
          </p>
          <p className="tv-caption mt-0.5 normal-case tracking-normal text-[var(--color-text-muted)]">
            {formatShortDate(expense.expense_date)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="tv-tabular font-bold text-[var(--color-danger)]">
            {formatCurrencyDetailed(expense.amount)}
          </p>
          {hasReceipt ? (
            <button
              type="button"
              onClick={() => onViewReceipt(expense)}
              className="tv-icon-btn flex size-8 items-center justify-center"
              aria-label="View receipt"
            >
              <FileText
                className="size-5 text-[var(--color-success-text)]"
                strokeWidth={2}
              />
            </button>
          ) : (
            <AlertCircle
              className={`size-5 ${
                hasNoReceiptNote
                  ? "text-[var(--color-warning-text)]"
                  : "text-[var(--color-warning-text)]"
              }`}
              strokeWidth={2}
              aria-label={hasNoReceiptNote ? "No receipt on file" : "Receipt missing"}
            />
          )}
        </div>
      </div>
    </div>
  );
});

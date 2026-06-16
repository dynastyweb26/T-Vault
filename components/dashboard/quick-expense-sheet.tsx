"use client";

import { Plus } from "lucide-react";
import { AddTruckExpenseSheet } from "@/components/expenses/add-truck-expense-sheet";

interface QuickExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
}

export function QuickExpenseSheet({
  open,
  onClose,
  onSaved,
}: QuickExpenseSheetProps) {
  return (
    <AddTruckExpenseSheet
      open={open}
      onClose={onClose}
      onSaved={() => onSaved?.("Truck expense saved")}
    />
  );
}

interface QuickExpenseRowProps {
  onOpen: () => void;
}

export function QuickExpenseRow({ onOpen }: QuickExpenseRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tv-glass-card tv-pressable flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left transition-opacity duration-150 active:opacity-90"
    >
      <Plus
        className="size-5 text-[var(--color-accent)]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="tv-link text-[14px]">Quick add truck expense</span>
    </button>
  );
}

"use client";

import { useState } from "react";
import {
  Fuel,
  MoreHorizontal,
  Plus,
  Receipt,
  Shield,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { validateLoadValue } from "@/lib/validation";

const EXPENSE_CATEGORIES = [
  { id: "Fuel", label: "Fuel", icon: Fuel },
  { id: "Tolls", label: "Tolls", icon: Receipt },
  { id: "Maintenance", label: "Maintenance", icon: Wrench },
  { id: "Insurance", label: "Insurance", icon: Shield },
  { id: "Food", label: "Food", icon: Utensils },
  { id: "Other", label: "Other", icon: MoreHorizontal },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
}>;

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
  const { user } = useAuth();
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].id);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const saveExpense = async () => {
    const error = validateLoadValue(amount);
    setAmountError(error);
    if (error || !user) return;

    setLoading(true);
    const supabase = createClient();
    const numericAmount = Number(amount.replace(/[^0-9.]/g, ""));

    const { error: insertError } = await supabase.from("expenses").insert({
      user_id: user.id,
      job_id: null,
      category,
      amount: numericAmount,
      expense_date: new Date().toISOString().slice(0, 10),
    });

    setLoading(false);

    if (insertError) {
      setAmountError("Could not save expense. Try again.");
      return;
    }

    onSaved?.(`${category} saved — $${numericAmount.toLocaleString()}`);
    setAmount("");
    setCategory(EXPENSE_CATEGORIES[0].id);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add Expense"
      ariaLabel="Add expense"
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="tv-label mb-2">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_CATEGORIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                className={`tv-chip flex h-20 flex-col items-center justify-center gap-1 ${
                  category === option.id ? "tv-chip-active" : "tv-chip-inactive"
                }`}
              >
                <option.icon className="size-6" strokeWidth={2} aria-hidden />
                <span className="text-[13px]">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <TvInput
          label="Amount"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value.replace(/[^0-9.]/g, ""))
          }
          error={amountError}
          helper="Enter dollars only — no $ sign needed"
        />

        <TvButton loading={loading} onClick={saveExpense}>
          Save Expense
        </TvButton>
      </div>
    </BottomSheet>
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
      <span className="tv-link text-[14px]">Quick add expense</span>
    </button>
  );
}

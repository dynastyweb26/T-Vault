"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { validateLoadValue } from "@/lib/validation";

const EXPENSE_CATEGORIES = [
  "Fuel",
  "Tolls",
  "Maintenance",
  "Insurance",
  "Food",
  "Other",
] as const;

interface QuickExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function QuickExpenseSheet({
  open,
  onClose,
  onSaved,
}: QuickExpenseSheetProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

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

    onSaved(`${category} saved — $${numericAmount.toLocaleString()}`);
    setAmount("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-[var(--color-overlay)] backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Quick add expense"
        className="tv-glass-card w-full rounded-t-[var(--radius-sheet)] border-b-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="tv-section-header">Quick add expense</h2>
          <button
            type="button"
            aria-label="Close expense sheet"
            onClick={onClose}
            className="flex size-11 items-center justify-center text-[var(--color-text-secondary)]"
          >
            <X className="size-6" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="tv-label mb-2">Category</p>
            <div className="grid grid-cols-2 gap-2">
              {EXPENSE_CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={`h-12 rounded-xl border text-[15px] ${
                    category === option
                      ? "tv-chip-active border-[var(--color-accent)]/35 bg-[var(--color-accent)]/5"
                      : "tv-chip-inactive border-white/5 bg-[#050505]"
                  }`}
                >
                  {option}
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
            Save expense
          </TvButton>
        </div>
      </div>
    </div>
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
      <span className="tv-link text-[14px]">
        Quick add expense
      </span>
    </button>
  );
}

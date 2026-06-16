"use client";

import { useEffect, useState } from "react";
import { Camera, FileText, Image as ImageIcon } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { TvDateInput } from "@/components/tv/tv-date-input";
import { TvTextarea } from "@/components/tv/tv-textarea";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { TEXT_LIMITS } from "@/lib/constants";
import { triggerHaptic } from "@/lib/haptics";
import {
  getTextCounter,
  sanitizeText,
  validateLoadValue,
  validateTextLength,
} from "@/lib/validation";
import {
  TRUCK_EXPENSE_CATEGORIES,
  type TruckExpenseCategoryId,
} from "@/lib/expenses/constants";

type ReceiptMode = "receipt" | "no_receipt";

interface AddTruckExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (expenseId: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function AddTruckExpenseSheet({
  open,
  onClose,
  onSaved,
}: AddTruckExpenseSheetProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<TruckExpenseCategoryId>("fuel");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today());
  const [description, setDescription] = useState("");
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("receipt");
  const [noReceiptReason, setNoReceiptReason] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [noReceiptError, setNoReceiptError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory("fuel");
    setAmount("");
    setExpenseDate(today());
    setDescription("");
    setReceiptMode("receipt");
    setNoReceiptReason("");
    setReceiptFile(null);
    setAmountError(null);
    setDateError(null);
    setDescriptionError(null);
    setNoReceiptError(null);
    setFormError(null);
  }, [open]);

  const saveExpense = async () => {
    const nextAmountError = validateLoadValue(amount);
    const nextDateError = expenseDate
      ? null
      : "Date is required.";
    const nextDescriptionError =
      description.trim().length > TEXT_LIMITS.description
        ? `Description must be ${TEXT_LIMITS.description} characters or fewer.`
        : null;
    const nextNoReceiptError =
      receiptMode === "no_receipt"
        ? validateTextLength(noReceiptReason, TEXT_LIMITS.description, "Note")
        : null;

    setAmountError(nextAmountError);
    setDateError(nextDateError);
    setDescriptionError(nextDescriptionError);
    setNoReceiptError(nextNoReceiptError);

    if (
      nextAmountError ||
      nextDateError ||
      nextDescriptionError ||
      nextNoReceiptError ||
      !user
    ) {
      return;
    }

    setLoading(true);
    setFormError(null);

    const supabase = createClient();
    const numericAmount = Number(amount.replace(/[^0-9.]/g, ""));
    const sanitizedDescription = sanitizeText(description);

    const { data: inserted, error: insertError } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        job_id: null,
        category,
        amount: numericAmount,
        expense_date: expenseDate,
        description: sanitizedDescription || null,
        no_receipt_reason:
          receiptMode === "no_receipt" ? sanitizeText(noReceiptReason) : null,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      setLoading(false);
      setFormError("Could not save expense. Try again.");
      return;
    }

    if (receiptMode === "receipt" && receiptFile) {
      const formData = new FormData();
      formData.append("file", receiptFile);
      formData.append("expenseId", inserted.id);

      const uploadResponse = await fetch("/api/expenses/upload-receipt", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        await supabase
          .from("expenses")
          .delete()
          .eq("id", inserted.id)
          .eq("user_id", user.id)
          .is("job_id", null);
        setLoading(false);
        setFormError("Could not save expense. Try again.");
        return;
      }
    }

    triggerHaptic("medium");
    setLoading(false);
    onSaved?.(inserted.id);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add Truck Expense"
      ariaLabel="Add truck expense"
      surface="solid"
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="tv-label mb-2">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {TRUCK_EXPENSE_CATEGORIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                className={`tv-chip flex h-20 flex-col items-center justify-center gap-1 ${
                  category === option.id ? "tv-chip-active" : "tv-chip-inactive"
                }`}
              >
                <option.icon className="size-6" strokeWidth={2} aria-hidden />
                <span className="text-center text-[13px] leading-tight">
                  {option.label}
                </span>
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
          helper="Enter dollars only — max $999,999"
        />

        <TvDateInput
          label="Date"
          value={expenseDate}
          onChange={(event) => setExpenseDate(event.target.value)}
          error={dateError}
        />

        <TvTextarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={TEXT_LIMITS.description}
          rows={3}
          error={descriptionError}
        />
        {getTextCounter(description, TEXT_LIMITS.description) ? (
          <p className="-mt-2 text-[12px] text-[var(--color-text-muted)]">
            {getTextCounter(description, TEXT_LIMITS.description)}
          </p>
        ) : null}

        <div>
          <p className="tv-label mb-2">Receipt</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReceiptMode("receipt")}
              className={`tv-chip h-11 ${
                receiptMode === "receipt" ? "tv-chip-active" : "tv-chip-inactive"
              }`}
            >
              Receipt
            </button>
            <button
              type="button"
              onClick={() => {
                setReceiptMode("no_receipt");
                setReceiptFile(null);
              }}
              className={`tv-chip h-11 ${
                receiptMode === "no_receipt"
                  ? "tv-chip-active"
                  : "tv-chip-inactive"
              }`}
            >
              No receipt
            </button>
          </div>
        </div>

        {receiptMode === "receipt" ? (
          <div className="space-y-2">
            <label className="flex h-16 cursor-pointer items-center gap-3 rounded-2xl tv-glass-card px-4">
              <Camera className="size-6 text-[var(--color-accent)]" strokeWidth={2} />
              <span className="text-[15px]">Take a Photo</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setReceiptFile(file);
                }}
              />
            </label>
            <label className="flex h-16 cursor-pointer items-center gap-3 rounded-2xl tv-glass-card px-4">
              <ImageIcon className="size-6 text-[var(--color-accent)]" strokeWidth={2} />
              <span className="text-[15px]">Choose from Gallery</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setReceiptFile(file);
                }}
              />
            </label>
            {receiptFile ? (
              <p className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
                <FileText className="size-4 text-[var(--color-success-text)]" />
                {receiptFile.name}
              </p>
            ) : null}
          </div>
        ) : (
          <TvTextarea
            label="Why is there no receipt?"
            value={noReceiptReason}
            onChange={(event) => setNoReceiptReason(event.target.value)}
            maxLength={TEXT_LIMITS.description}
            rows={2}
            error={noReceiptError}
          />
        )}

        {formError ? (
          <p className="text-[14px] text-[var(--color-danger-text)]">{formError}</p>
        ) : null}

        <TvButton loading={loading} onClick={saveExpense}>
          Save Expense
        </TvButton>
      </div>
    </BottomSheet>
  );
}

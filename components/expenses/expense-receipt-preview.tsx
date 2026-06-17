"use client";

import { useCallback } from "react";
import { Download, X } from "lucide-react";
import { PinchZoomImage } from "@/components/expenses/pinch-zoom-image";
import { isPdfDocument } from "@/lib/job-folder/document-fields";
import { getCategoryMeta } from "@/lib/expenses/constants";
import type { Expense } from "@/types/jobs";

interface ExpenseReceiptPreviewProps {
  expense: Expense | null;
  onClose: () => void;
}

export function ExpenseReceiptPreview({
  expense,
  onClose,
}: ExpenseReceiptPreviewProps) {
  const handleDownload = useCallback(async () => {
    if (!expense?.receipt_url) return;
    const category = getCategoryMeta(expense.category);
    const fileName = `${category.label}-receipt-${Date.now()}.${
      isPdfDocument(expense.receipt_url) ? "pdf" : "jpg"
    }`;

    try {
      const response = await fetch(expense.receipt_url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.rel = "noopener";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.alert("Download failed — check your connection and try again.");
    }
  }, [expense]);

  if (!expense?.receipt_url) return null;

  const category = getCategoryMeta(expense.category);
  const pdf = isPdfDocument(expense.receipt_url);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[var(--color-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt for ${category.label}`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-shell-border)] px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 pr-4">
          <p className="tv-body truncate font-semibold">{category.label} Receipt</p>
          {expense.description ? (
            <p className="tv-caption mt-0.5 truncate normal-case tracking-normal">
              {expense.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download receipt"
            className="tv-accent-outline-btn tv-icon-btn rounded-xl"
          >
            <Download className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="tv-outline-btn tv-icon-btn rounded-xl"
          >
            <X className="size-6" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {pdf ? (
          <iframe
            src={expense.receipt_url}
            title={`${category.label} receipt`}
            className="h-full w-full flex-1 rounded-2xl border border-[var(--color-shell-border)] bg-[var(--color-input-bg)]"
          />
        ) : (
          <PinchZoomImage
            src={expense.receipt_url}
            alt={`${category.label} receipt`}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { isPdfDocument } from "@/lib/job-folder/document-fields";
import { getCategoryMeta } from "@/lib/expenses/constants";
import type { Expense } from "@/types/jobs";

interface ExpenseReceiptPreviewProps {
  expense: Expense | null;
  onClose: () => void;
}

function PinchZoomImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);

  const getTouchDistance = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  return (
    <div
      className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden"
      onTouchStart={(event) => {
        if (event.touches.length === 2) {
          pinchStartDistance.current = getTouchDistance(event.touches);
          pinchStartScale.current = scale;
          isPanning.current = false;
        } else if (event.touches.length === 1 && scale > 1) {
          isPanning.current = true;
          panStart.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
          lastPan.current = translate;
        }
      }}
      onTouchMove={(event) => {
        if (event.touches.length === 2 && pinchStartDistance.current) {
          const distance = getTouchDistance(event.touches);
          const nextScale = Math.min(
            4,
            Math.max(1, (distance / pinchStartDistance.current) * pinchStartScale.current)
          );
          setScale(nextScale);
          if (nextScale <= 1) setTranslate({ x: 0, y: 0 });
        } else if (event.touches.length === 1 && isPanning.current && scale > 1) {
          const dx = event.touches[0].clientX - panStart.current.x;
          const dy = event.touches[0].clientY - panStart.current.y;
          setTranslate({
            x: lastPan.current.x + dx,
            y: lastPan.current.y + dy,
          });
        }
      }}
      onTouchEnd={() => {
        pinchStartDistance.current = null;
        isPanning.current = false;
        if (scale <= 1.05) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        }
      }}
      onDoubleClick={() => {
        if (scale > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(2);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full select-none object-contain"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: pinchStartDistance.current ? "none" : "transform 150ms ease-out",
        }}
        draggable={false}
      />
    </div>
  );
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

"use client";

import { useCallback } from "react";
import { Download, X } from "lucide-react";
import { DOC_TYPE_LABELS } from "@/lib/job-folder/constants";
import { isPdfDocument } from "@/lib/job-folder/document-fields";
import type { JobDocument } from "@/types/jobs";

interface DocumentPreviewModalProps {
  document: JobDocument | null;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  onClose,
}: DocumentPreviewModalProps) {
  const handleDownload = useCallback(async () => {
    if (!document?.file_url) return;
    const fileName =
      document.file_name ||
      `${document.document_type}-${Date.now()}.${isPdfDocument(document.file_url, document.file_name) ? "pdf" : "jpg"}`;

    try {
      const response = await fetch(document.file_url);
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
  }, [document]);

  if (!document?.file_url) return null;

  const title =
    DOC_TYPE_LABELS[document.document_type as keyof typeof DOC_TYPE_LABELS] ??
    "Document";
  const pdf = isPdfDocument(document.file_url, document.file_name);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[#0a0a0a]"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title}`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 pr-4">
          <p className="truncate text-[17px] font-semibold text-[#E9E1D7]">
            {title}
          </p>
          {document.file_name ? (
            <p className="truncate text-[13px] text-[#99907E]">
              {document.file_name}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download document"
            className="flex size-11 items-center justify-center rounded-xl border border-[#D4A017]/40 text-[#D4A017]"
          >
            <Download className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-[#E9E1D7]"
          >
            <X className="size-6" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {pdf ? (
          <iframe
            src={document.file_url}
            title={title}
            className="h-full w-full flex-1 rounded-2xl border border-white/5 bg-[#050505]"
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={document.file_url}
              alt={title}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

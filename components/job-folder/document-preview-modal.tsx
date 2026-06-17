"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document?.file_url) {
      setPreviewUrl(null);
      return;
    }

    let active = true;
    setLoading(true);

    const loadUrl = async () => {
      try {
        const response = await fetch("/api/documents/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id }),
        });

        if (response.ok) {
          const payload = await response.json();
          if (active) {
            setPreviewUrl(payload.url ?? document.file_url);
          }
          return;
        }
      } catch {
        // Fall back to stored URL below.
      }

      if (active) {
        setPreviewUrl(document.file_url);
      }
    };

    void loadUrl().finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [document]);

  const handleDownload = useCallback(async () => {
    const fileUrl = previewUrl ?? document?.file_url;
    if (!fileUrl || !document) return;
    const fileName =
      document.file_name ||
      `${document.document_type}-${Date.now()}.${isPdfDocument(fileUrl, document.file_name) ? "pdf" : "jpg"}`;

    try {
      const response = await fetch(fileUrl);
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
  }, [document, previewUrl]);

  if (!document?.file_url) return null;

  const title =
    DOC_TYPE_LABELS[document.document_type as keyof typeof DOC_TYPE_LABELS] ??
    "Document";
  const fileUrl = previewUrl ?? document.file_url;
  const pdf = isPdfDocument(fileUrl, document.file_name);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[var(--color-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title}`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-shell-border)] px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 pr-4">
          <p className="tv-body truncate font-semibold">{title}</p>
          {document.file_name ? (
            <p className="tv-caption mt-0.5 truncate normal-case tracking-normal">
              {document.file_name}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download document"
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
        {loading ? (
          <div className="tv-skeleton m-auto h-48 w-full max-w-md rounded-2xl" />
        ) : pdf ? (
          <iframe
            src={fileUrl}
            title={title}
            className="h-full w-full flex-1 rounded-2xl border border-[var(--color-shell-border)] bg-[var(--color-input-bg)]"
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={title}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

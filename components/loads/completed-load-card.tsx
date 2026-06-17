"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/dashboard/format";
import { getCompletionDate } from "@/lib/loads/queries";
import type { Job, JobDocument } from "@/types/jobs";
import { APP_ROUTES } from "@/lib/constants";
import { DOC_TYPE_LABELS } from "@/lib/job-folder/constants";
import { DocumentPreviewModal } from "@/components/job-folder/document-preview-modal";

interface CompletedLoadCardProps {
  job: Job;
  documents: JobDocument[];
}

export function CompletedLoadCard({ job, documents }: CompletedLoadCardProps) {
  const [previewDoc, setPreviewDoc] = useState<JobDocument | null>(null);
  const paidDate = getCompletionDate(job);
  const invoiceDoc = documents.find((doc) => doc.document_type === "invoice");
  const viewableDocs = documents.filter(
    (doc) => doc.document_type !== "invoice"
  );

  const handleInvoiceDownload = async () => {
    const url = job.invoice_url || invoiceDoc?.file_url;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `invoice-${job.job_name.replace(/\s+/g, "-")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.alert("Download failed — check your connection and try again.");
    }
  };

  return (
    <>
      <article
        className="tv-glass-card rounded-2xl p-4"
        style={{ borderLeft: "3px solid var(--color-success)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`${APP_ROUTES.loads}/${job.id}`}>
              <h3 className="tv-card-title truncate">{job.job_name}</h3>
            </Link>
            <p className="tv-body mt-1 text-[14px] text-[var(--color-text-secondary)]">
              Paid {formatShortDate(paidDate)}
            </p>
          </div>
          <p
            className="tv-tabular shrink-0 text-[18px] font-bold"
            style={{ color: "var(--color-success-text)" }}
          >
            {formatCurrency(job.load_value ?? 0)}
          </p>
        </div>

        {viewableDocs.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {viewableDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setPreviewDoc(doc)}
                className="tv-outline-btn inline-flex h-11 items-center gap-2 px-3 text-[13px]"
              >
                <FileText className="size-4" strokeWidth={2} aria-hidden />
                {DOC_TYPE_LABELS[
                  doc.document_type as keyof typeof DOC_TYPE_LABELS
                ] ?? "Document"}
              </button>
            ))}
          </div>
        ) : null}

        {invoiceDoc || job.invoice_url ? (
          <button
            type="button"
            onClick={handleInvoiceDownload}
            className="tv-accent-outline-btn mt-3 inline-flex h-11 items-center gap-2 px-4 text-[14px]"
          >
            <Download className="size-4" strokeWidth={2} aria-hidden />
            Invoice download
          </button>
        ) : null}
      </article>

      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
}

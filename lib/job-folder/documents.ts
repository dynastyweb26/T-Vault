import type { JobDocument } from "@/types/jobs";
import type { DocumentType } from "@/types/job-folder";
import {
  DOC_TYPE_LABELS,
  REQUIRED_DOC_TYPES,
  type RequiredDocType,
} from "@/lib/job-folder/constants";

export function documentsByType(
  documents: JobDocument[]
): Map<string, JobDocument> {
  const map = new Map<string, JobDocument>();
  documents.forEach((doc) => map.set(doc.document_type, doc));
  return map;
}

export function hasDocument(
  documents: JobDocument[],
  type: DocumentType | string
): boolean {
  return documents.some(
    (doc) => doc.document_type === type && Boolean(doc.file_url)
  );
}

export function getDocument(
  documents: JobDocument[],
  type: DocumentType | string
): JobDocument | undefined {
  return documents.find((doc) => doc.document_type === type);
}

export function countRequiredDocs(documents: JobDocument[]): {
  complete: number;
  total: number;
} {
  const complete = REQUIRED_DOC_TYPES.filter((type) =>
    hasDocument(documents, type)
  ).length;
  return { complete, total: REQUIRED_DOC_TYPES.length };
}

export function countOptionalDocs(documents: JobDocument[]): number {
  return (["fuel_receipt", "lumper_receipt"] as const).filter((type) =>
    hasDocument(documents, type)
  ).length;
}

export function isInvoiceGenerated(documents: JobDocument[]): boolean {
  return hasDocument(documents, "invoice");
}

export function requiredDocsProgress(documents: JobDocument[]): number {
  const { complete, total } = countRequiredDocs(documents);
  return total ? (complete / total) * 100 : 0;
}

export function isChecklistComplete(documents: JobDocument[]): boolean {
  const { complete, total } = countRequiredDocs(documents);
  return complete === total && isInvoiceGenerated(documents);
}

export function missingRequiredLabels(documents: JobDocument[]): string[] {
  return REQUIRED_DOC_TYPES.filter((type) => !hasDocument(documents, type)).map(
    (type) => DOC_TYPE_LABELS[type as RequiredDocType]
  );
}

export function missingChecklistItems(documents: JobDocument[]): string[] {
  const missing = missingRequiredLabels(documents);
  if (!isInvoiceGenerated(documents)) missing.push("Invoice");
  return missing;
}

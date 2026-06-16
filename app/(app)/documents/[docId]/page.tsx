"use client";

import { use } from "react";
import { DocumentDetailView } from "@/components/document-wallet/document-detail-view";

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = use(params);
  return <DocumentDetailView documentId={docId} />;
}

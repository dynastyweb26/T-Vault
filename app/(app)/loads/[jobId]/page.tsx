"use client";

import { use } from "react";
import { JobFolderView } from "@/components/job-folder/job-folder-view";

export default function JobFolderPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  return <JobFolderView jobId={jobId} />;
}

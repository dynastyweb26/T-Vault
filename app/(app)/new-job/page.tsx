"use client";

import { useEffect } from "react";
import { useNewJobSheet } from "@/components/providers/new-job-provider";
import { NewJobSheet } from "@/components/jobs/new-job-sheet";

export default function NewJobPage() {
  const { openSheet } = useNewJobSheet();

  useEffect(() => {
    openSheet();
  }, [openSheet]);

  return null;
}

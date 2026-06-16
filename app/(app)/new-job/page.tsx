"use client";

import { useEffect } from "react";
import { useNewJobSheet } from "@/components/providers/new-job-provider";

export default function NewJobPage() {
  const { openSheet } = useNewJobSheet();

  useEffect(() => {
    openSheet();
  }, [openSheet]);

  return null;
}

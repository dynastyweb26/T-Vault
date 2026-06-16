"use client";

import { Plus } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";

export default function NewJobPage() {
  return (
    <>
      <AppHeader
        title="New Job"
        subtitle="Job creation arrives in Phase 2"
      />
      <section className="mt-10 flex flex-col items-center rounded-[var(--radius-card)] bg-[var(--color-surface)] px-6 py-10 text-center">
        <Plus
          className="size-12 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="tv-card-title mt-4">Coming soon</h2>
        <p className="mt-2 max-w-xs text-[16px] text-[var(--color-text-secondary)]">
          The new job flow will be built in the next phase. Your shell and
          navigation are ready.
        </p>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { APP_ROUTES } from "@/lib/constants";

export default function JobFolderPage() {
  const params = useParams<{ jobId: string }>();

  return (
    <>
      <AppHeader title="Job Folder" subtitle={`Load ${params.jobId.slice(0, 8)}`} />
      <section className="mt-6 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
        <p className="text-[17px] text-[var(--color-text-secondary)]">
          Full job folder details arrive in a later phase. You tapped through
          from the dashboard.
        </p>
        <Link href={APP_ROUTES.dashboard} className="mt-6 block">
          <TvButton variant="secondary">Back to dashboard</TvButton>
        </Link>
      </section>
    </>
  );
}

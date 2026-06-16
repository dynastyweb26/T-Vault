"use client";

import { useRouter, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";
import { useNewJobSheet } from "@/components/providers/new-job-provider";

export function DashboardFab() {
  const router = useRouter();
  const pathname = usePathname();
  const { openSheet } = useNewJobSheet();

  return (
    <button
      type="button"
      aria-label="Create new job"
      onClick={() => {
        if (pathname === APP_ROUTES.newJob) openSheet();
        else router.push(APP_ROUTES.newJob);
      }}
      className="tv-pressable fixed bottom-24 right-4 z-40 flex size-16 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-none transition-transform duration-150 active:scale-[0.97]"
    >
      <Plus className="size-8" strokeWidth={2} aria-hidden />
    </button>
  );
}

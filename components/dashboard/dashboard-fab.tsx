import Link from "next/link";
import { Plus } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";

export function DashboardFab() {
  return (
    <Link
      href={APP_ROUTES.newJob}
      aria-label="Create new job"
      className="tv-pressable fixed bottom-24 right-4 z-40 flex size-16 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-none transition-transform duration-150 active:scale-[0.97]"
    >
      <Plus className="size-8" strokeWidth={2} aria-hidden />
    </Link>
  );
}

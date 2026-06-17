"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Plus, Truck } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useNewJobSheet } from "@/components/providers/new-job-provider";

const actions = [
  {
    id: "log-load",
    label: "Log Load",
    icon: Plus,
    primary: true,
  },
  {
    id: "status",
    label: "Status",
    icon: Truck,
    href: APP_ROUTES.loads,
  },
  {
    id: "metrics",
    label: "Metrics",
    icon: BarChart3,
    href: "#ledger-insight",
  },
] as const;

export function QuickActions() {
  const router = useRouter();
  const pathname = usePathname();
  const { openSheet } = useNewJobSheet();

  const handleLogLoad = () => {
    if (pathname === APP_ROUTES.newJob) {
      openSheet();
    } else {
      router.push(APP_ROUTES.newJob);
    }
  };

  return (
    <div
      data-tour="dashboard-quick-actions"
      className="flex gap-4 overflow-x-auto border-b border-[var(--color-shell-border)] px-5 py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {actions.map((action) => {
        const Icon = action.icon;

        if (action.id === "log-load") {
          return (
            <button
              key={action.id}
              type="button"
              onClick={handleLogLoad}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <div className="rounded-full border-2 border-[var(--color-accent)] p-1">
                <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
                  <Icon
                    className="size-6 text-[var(--color-accent)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
              </div>
              <span className="tv-caption opacity-60">{action.label}</span>
            </button>
          );
        }

        if (action.id === "metrics") {
          return (
            <a
              key={action.id}
              href={action.href}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <div className="rounded-full border-2 border-[var(--color-accent)]/20 p-1 opacity-50">
                <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
                  <Icon
                    className="size-6 text-[var(--color-text-secondary)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
              </div>
              <span className="tv-caption opacity-60">{action.label}</span>
            </a>
          );
        }

        return (
          <Link
            key={action.id}
            href={action.href!}
            className={cn(
              "flex shrink-0 flex-col items-center gap-2",
              pathname === action.href && "opacity-100"
            )}
          >
            <div className="rounded-full border-2 border-[var(--color-accent)]/20 p-1 opacity-50">
              <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
                <Icon
                  className="size-6 text-[var(--color-text-secondary)]"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            </div>
            <span className="tv-caption opacity-60">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

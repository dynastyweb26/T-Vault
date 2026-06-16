"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  Home,
  Plus,
  Receipt,
  User,
} from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useNewJobSheet } from "@/components/providers/new-job-provider";

const tabs = [
  { href: APP_ROUTES.dashboard, label: "Dashboard", icon: Home },
  { href: APP_ROUTES.loads, label: "My Loads", icon: Folder },
  { href: APP_ROUTES.newJob, label: "New Job", icon: Plus, center: true },
  { href: APP_ROUTES.expenses, label: "Expenses", icon: Receipt },
  { href: APP_ROUTES.profile, label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { openSheet } = useNewJobSheet();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-end px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          if ("center" in tab && tab.center) {
            return (
              <li key={tab.href} className="flex justify-center">
                <button
                  type="button"
                  aria-label="Create new job"
                  onClick={() => {
                    if (pathname === APP_ROUTES.newJob) {
                      openSheet();
                    } else {
                      router.push(APP_ROUTES.newJob);
                    }
                  }}
                  className="tv-pressable -mt-5 flex size-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] transition-transform duration-150 active:scale-[0.97]"
                >
                  <Plus className="size-7" strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-label={tab.label}
                className={cn(
                  "tv-pressable flex h-16 flex-col items-center justify-center gap-1 text-[12px] transition-colors duration-150",
                  isActive
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)]"
                )}
              >
                <Icon className="size-6" strokeWidth={2} aria-hidden />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

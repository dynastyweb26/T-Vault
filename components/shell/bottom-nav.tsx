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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-[var(--color-bg)]/95 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-3xl"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
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
                  className="tv-brushed-gold-btn tv-pressable mx-1 flex h-10 w-12 items-center justify-center rounded-lg transition-transform duration-150 active:scale-90"
                >
                  <Plus className="size-5 font-bold text-black" strokeWidth={2.5} aria-hidden />
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
                  "tv-pressable flex flex-col items-center justify-center gap-1 py-1 text-[10px] transition-colors duration-150",
                  isActive
                    ? "tv-active-glow font-bold text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                )}
              >
                <Icon
                  className="size-7"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

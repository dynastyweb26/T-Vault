"use client";

import { useEffect, useState } from "react";
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
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { hasExpiredDocuments } from "@/lib/document-wallet/queries";
import { triggerHaptic } from "@/lib/haptics";

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
  const { user } = useAuth();
  const [expiredDocs, setExpiredDocs] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    hasExpiredDocuments(supabase, user.id).then(setExpiredDocs);
  }, [user, pathname]);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-shell-border)] bg-[var(--color-bg)]/95 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-3xl"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          const showExpiredBadge =
            tab.href === APP_ROUTES.profile && expiredDocs;

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
                  className="tv-brushed-gold-btn tv-pressable tv-icon-btn mx-1 rounded-xl transition-transform duration-150 active:scale-90"
                >
                  <Plus
                    className="size-5 font-bold text-[var(--color-on-accent)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </button>
              </li>
            );
          }

          return (
            <li key={tab.href} className="relative">
              <Link
                href={tab.href}
                aria-label={tab.label}
                onClick={() => triggerHaptic("light")}
                className={cn(
                  "tv-pressable flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors duration-150",
                  isActive
                    ? "tv-active-glow font-bold text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "size-7",
                      showExpiredBadge && "tv-profile-expired-pulse"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden
                  />
                  {showExpiredBadge ? (
                    <span
                      className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[var(--color-danger)]"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

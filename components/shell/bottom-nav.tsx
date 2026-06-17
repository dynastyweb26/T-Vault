"use client";

import { memo, useEffect, useState } from "react";
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
import { triggerHaptic } from "@/lib/haptics";

const tabs = [
  { href: APP_ROUTES.dashboard, label: "Dashboard", icon: Home },
  { href: APP_ROUTES.loads, label: "My Loads", icon: Folder },
  { href: APP_ROUTES.newJob, label: "New Job", icon: Plus, center: true },
  { href: APP_ROUTES.expenses, label: "Expenses", icon: Receipt },
  { href: APP_ROUTES.profile, label: "Profile", icon: User },
] as const;

const BottomNavTab = memo(function BottomNavTab({
  href,
  label,
  icon: Icon,
  isActive,
  showExpiredBadge,
  onNewJob,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
  showExpiredBadge: boolean;
  onNewJob?: () => void;
}) {
  if (onNewJob) {
    return (
      <li className="flex justify-center">
        <button
          type="button"
          aria-label="Create new job"
          onClick={onNewJob}
          className="tv-brushed-gold-btn tv-gold-glow tv-pressable tv-icon-btn mx-1 rounded-full"
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
    <li className="relative">
      <Link
        href={href}
        aria-label={label}
        onClick={() => triggerHaptic("light")}
        className={cn(
          "tv-pressable flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium tracking-wide transition-colors",
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
        <span>{label}</span>
      </Link>
    </li>
  );
});

export const BottomNav = memo(function BottomNav({
  pathname,
  expiredDocs,
  onNewJob,
}: {
  pathname: string;
  expiredDocs: boolean;
  onNewJob: () => void;
}) {
  return (
    <nav
      aria-label="Main navigation"
      className="tv-frosted-bar fixed inset-x-0 bottom-0 z-50 border-t pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const showExpiredBadge =
            tab.href === APP_ROUTES.profile && expiredDocs;

          return (
            <BottomNavTab
              key={tab.href}
              href={tab.href}
              label={tab.label}
              icon={tab.icon}
              isActive={isActive}
              showExpiredBadge={showExpiredBadge}
              onNewJob={"center" in tab && tab.center ? onNewJob : undefined}
            />
          );
        })}
      </ul>
    </nav>
  );
});

export function BottomNavContainer() {
  const pathname = usePathname();
  const router = useRouter();
  const { openSheet } = useNewJobSheet();
  const [expiredDocs, setExpiredDocs] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadExpiredDocs = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { hasExpiredDocuments } = await import(
        "@/lib/document-wallet/queries"
      );
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const expired = await hasExpiredDocuments(supabase, user.id);
      if (!cancelled) setExpiredDocs(expired);
    };

    const timer = window.setTimeout(() => {
      void loadExpiredDocs();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  const handleNewJob = () => {
    if (pathname === APP_ROUTES.newJob) {
      openSheet();
    } else {
      router.push(APP_ROUTES.newJob);
    }
  };

  return (
    <BottomNav
      pathname={pathname}
      expiredDocs={expiredDocs}
      onNewJob={handleNewJob}
    />
  );
}

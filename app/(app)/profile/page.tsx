"use client";

import { Bebas_Neue } from "next/font/google";
import Link from "next/link";
import { ChevronRight, FileSpreadsheet, History, User } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { DataProtectionBanner } from "@/components/shell/session-banner";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { APP_ROUTES } from "@/lib/constants";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const { preference, setPreference } = useTheme();

  return (
    <>
      <AppHeader title="Profile" subtitle="Your account and preferences" />
      <div className="mt-6 flex flex-col gap-4 px-5">
        <DataProtectionBanner />

        <section className="tv-glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10">
              <User
                className="size-7 text-[var(--color-accent)]"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <div>
              <p className="tv-card-title">{profile?.full_name || "Driver"}</p>
              <p className="tv-body text-[15px] text-[var(--color-text-secondary)]">
                {profile?.email}
              </p>
            </div>
          </div>

          <div className="tv-body mt-5 space-y-3">
            <p>
              <span className="text-[var(--color-text-secondary)]">Company: </span>
              {profile?.company_name || "Not set"}
            </p>
            <p>
              <span className="text-[var(--color-text-secondary)]">MC: </span>
              {profile?.mc_number || "Not set"}
            </p>
            <p>
              <span className="text-[var(--color-text-secondary)]">DOT: </span>
              {profile?.dot_number || "Not set"}
            </p>
          </div>

          <div className="tv-brushed-gold-btn tv-gold-glow mt-5 rounded-2xl px-5 py-6 text-center">
            <p className="tv-caption mb-4 text-[var(--color-accent)]">Referral Code</p>
            <p
              className={`${bebasNeue.className} rounded-xl bg-[var(--color-hero-scrim)] px-4 py-3 text-[40px] leading-none tracking-wider text-[var(--color-on-accent)]`}
            >
              {profile?.referral_code || "Generating..."}
            </p>
          </div>
        </section>

        <section className="tv-glass-card rounded-2xl p-2">
          <Link
            href={APP_ROUTES.taxSummary}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3"
          >
            <FileSpreadsheet
              className="size-5 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="tv-body flex-1 font-medium">Tax Summary</span>
            <ChevronRight
              className="size-5 text-[var(--color-text-muted)]"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
          <Link
            href={APP_ROUTES.brokerHistory}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3"
          >
            <History
              className="size-5 text-[var(--color-accent)]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="tv-body flex-1 font-medium">Broker History</span>
            <ChevronRight
              className="size-5 text-[var(--color-text-muted)]"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </section>

        <section className="tv-glass-card rounded-2xl p-5">
          <p className="tv-label mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {(["dark", "light", "system"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPreference(option)}
                className={`h-12 min-h-11 rounded-xl border text-[15px] capitalize transition-colors ${
                  preference === option
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                    : "border-[var(--color-shell-border)] bg-[var(--color-input-bg)] text-[var(--color-text-secondary)]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <TvButton variant="secondary" onClick={signOut}>
          Sign out
        </TvButton>
      </div>
    </>
  );
}

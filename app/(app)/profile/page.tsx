"use client";

import { User } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { DataProtectionBanner } from "@/components/shell/session-banner";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const { preference, setPreference } = useTheme();

  return (
    <>
      <AppHeader title="Profile" subtitle="Your account and preferences" />
      <div className="mt-6 flex flex-col gap-4">
        <DataProtectionBanner />

        <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
              <User
                className="size-7 text-[var(--color-accent)]"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <div>
              <p className="tv-card-title">{profile?.full_name || "Driver"}</p>
              <p className="text-[15px] text-[var(--color-text-secondary)]">
                {profile?.email}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-[16px]">
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
            <p>
              <span className="text-[var(--color-text-secondary)]">Referral code: </span>
              <span className="text-[20px] font-bold text-[var(--color-accent)]">
                {profile?.referral_code || "Generating..."}
              </span>
            </p>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
          <p className="tv-label mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {(["dark", "light", "system"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPreference(option)}
                className={`h-12 rounded-[var(--radius-input)] border text-[15px] capitalize transition-colors ${
                  preference === option
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
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

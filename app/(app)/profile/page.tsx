"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Compass,
  FileSpreadsheet,
  Gift,
  HelpCircle,
  Lock,
  Mic,
  Moon,
  Shield,
  Sun,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { DataProtectionBanner } from "@/components/shell/session-banner";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useAppTour } from "@/components/providers/app-tour-provider";
import { APP_ROUTES } from "@/lib/constants";
import { VOICE_NOTES_ENABLED } from "@/lib/features";
import type { ThemePreference } from "@/types/database";

const THEME_LABELS: Record<ThemePreference, string> = {
  dark: "Dark",
  light: "Light",
  system: "System Default",
};

function ProfileRow({
  href,
  icon: Icon,
  label,
  value,
  onClick,
}: {
  href?: string;
  icon: typeof User;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <Icon
        className="size-5 shrink-0 text-[var(--color-accent)]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="tv-body flex-1 text-[16px] font-medium">{label}</span>
      {value ? (
        <span className="text-[15px] text-[var(--color-text-muted)]">{value}</span>
      ) : null}
      <ChevronRight
        className="size-5 text-[var(--color-text-muted)]"
        strokeWidth={2}
        aria-hidden
      />
    </>
  );

  const className =
    "flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 tv-pressable transition-opacity duration-150 active:opacity-90";

  if (onClick) {
    return (
      <button type="button" className={`w-full text-left ${className}`} onClick={onClick}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href!} className={className}>
      {inner}
    </Link>
  );
}

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const { preference, setPreference, theme } = useTheme();
  const { startTour } = useAppTour();
  const [themeOpen, setThemeOpen] = useState(false);

  const themeIcon = theme === "dark" ? Moon : Sun;

  return (
    <>
      <AppHeader title="Profile" subtitle="Your account and preferences" />
      <div className="mt-6 flex flex-col gap-4 px-5 pb-8">
        <DataProtectionBanner />

        <section className="tv-glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10">
              <User
                className="size-9 text-[var(--color-accent)]"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <div>
              <p className="tv-card-title">{profile?.full_name || "Driver"}</p>
              <p className="text-[16px] text-[var(--color-text-secondary)]">
                {profile?.company_name || "Company not set"}
              </p>
              {profile?.mc_number ? (
                <p className="text-[15px] text-[var(--color-text-muted)]">
                  MC {profile.mc_number}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section>
          <p className="tv-label mb-2 px-1">Account</p>
          <div className="tv-glass-card rounded-2xl p-2">
            <ProfileRow
              href={APP_ROUTES.editProfile}
              icon={User}
              label="Edit Profile"
            />
            <ProfileRow
              href={APP_ROUTES.changePassword}
              icon={Lock}
              label="Change Password"
            />
            <ProfileRow
              href={APP_ROUTES.notificationPrefs}
              icon={Bell}
              label="Notification Preferences"
            />
            <ProfileRow
              href={APP_ROUTES.documents}
              icon={Wallet}
              label="My Documents"
            />
            {VOICE_NOTES_ENABLED ? (
              <ProfileRow
                href={APP_ROUTES.voiceNotes}
                icon={Mic}
                label="Voice Notes"
              />
            ) : null}
          </div>
        </section>

        <section>
          <p className="tv-label mb-2 px-1">App</p>
          <div className="tv-glass-card rounded-2xl p-2">
            <ProfileRow
              icon={Compass}
              label="App Tour"
              onClick={() => {
                void startTour();
              }}
            />
          </div>
          <div className="tv-glass-card mt-2 rounded-2xl p-2" data-tour="profile-settings">
            <ProfileRow
              icon={themeIcon}
              label="Appearance"
              value={THEME_LABELS[preference]}
              onClick={() => setThemeOpen(true)}
            />
            <ProfileRow
              href={APP_ROUTES.taxSummary}
              icon={FileSpreadsheet}
              label="Tax Summary"
            />
            <ProfileRow
              href={APP_ROUTES.costPerMile}
              icon={TrendingUp}
              label="Cost Per Mile"
            />
            <ProfileRow href={APP_ROUTES.help} icon={HelpCircle} label="Help" />
            <ProfileRow href={APP_ROUTES.privacy} icon={Shield} label="Privacy" />
            <ProfileRow href={APP_ROUTES.terms} icon={FileSpreadsheet} label="Terms" />
          </div>
        </section>

        <section>
          <p className="tv-label mb-2 px-1">Invite Drivers</p>
          <div className="tv-glass-card rounded-2xl p-2" data-tour="profile-invite">
            <ProfileRow
              href={APP_ROUTES.referral}
              icon={Users}
              label="Invite a Driver"
            />
            <div className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-3">
              <Gift
                className="size-5 text-[var(--color-accent)]"
                strokeWidth={2}
                aria-hidden
              />
              <span className="tv-body flex-1 text-[16px] font-medium">
                Your code
              </span>
              <span className="text-[15px] text-[var(--color-accent)]">
                {profile?.referral_code ?? "..."}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[var(--color-danger)]/20 p-4">
          <p className="tv-label mb-3 text-[var(--color-danger-text)]">
            Danger Zone
          </p>
          <TvButton variant="secondary" onClick={signOut}>
            Sign Out
          </TvButton>
          <Link href={APP_ROUTES.deleteAccount} className="mt-3 block">
            <TvButton
              variant="secondary"
              className="w-full border-[var(--color-danger)]/30 text-[var(--color-danger-text)]"
            >
              Delete Account
            </TvButton>
          </Link>
        </section>
      </div>

      <BottomSheet
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        title="Appearance"
        ariaLabel="Choose appearance"
        surface="solid"
      >
        {(["dark", "light", "system"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={async () => {
              await setPreference(option);
              setThemeOpen(false);
            }}
            className={`mb-2 flex h-14 w-full items-center rounded-xl border px-4 text-[16px] ${
              preference === option
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                : "border-[var(--color-shell-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            {THEME_LABELS[option]}
          </button>
        ))}
      </BottomSheet>
    </>
  );
}

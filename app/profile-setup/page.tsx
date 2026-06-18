"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { RouteGuardLoading } from "@/components/shell/route-guard-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import {
  hasCompletedOnboarding,
  hasCompletedProfileSetup,
} from "@/lib/auth-helpers";
import {
  FIELD_LIMITS,
  formatDotNumber,
  formatMcNumber,
  getTextCounter,
  sanitizeText,
  validateDotNumber,
  validateMcNumber,
  validateTextLength,
} from "@/lib/validation";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [ein, setEin] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileResynced, setProfileResynced] = useState(false);
  const resyncAttempted = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      console.info("[profile-setup] redirect decision: no user -> sign-in");
      router.replace(APP_ROUTES.signIn);
      return;
    }

    // Wait for profile to load before gating — null is not "onboarding incomplete".
    // Middleware already routes authenticated users; treating null as incomplete
    // caused /profile-setup → /onboarding → /profile-setup redirect loops.
    if (!profile) return;

    if (!hasCompletedOnboarding(profile)) {
      if (!resyncAttempted.current) {
        resyncAttempted.current = true;
        console.warn(
          "[profile-setup] profile shows onboarding incomplete while route was allowed; refreshing profile before any redirect",
          {
            onboarding_completed: profile.onboarding_completed,
            profile_setup_completed: profile.profile_setup_completed,
            profile_setup_skipped: profile.profile_setup_skipped,
          }
        );
        void refreshProfile().finally(() => setProfileResynced(true));
        return;
      }

      if (!profileResynced) return;

      console.info(
        "[profile-setup] redirect decision: onboarding still incomplete after refresh -> onboarding"
      );
      router.replace(APP_ROUTES.onboarding);
      return;
    }

    if (hasCompletedProfileSetup(profile)) {
      console.info(
        "[profile-setup] redirect decision: profile setup already complete -> dashboard"
      );
      router.replace(APP_ROUTES.dashboard);
    } else {
      console.info("[profile-setup] redirect decision: allow profile setup page");
    }
  }, [authLoading, profile, profileResynced, refreshProfile, router, user]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCompanyName(profile.company_name ?? "");
    setMcNumber(profile.mc_number ?? "");
    setDotNumber(profile.dot_number ?? "");
    setEin(profile.ein ?? "");
  }, [profile]);

  const validate = () => {
    const nextErrors = {
      fullName: validateTextLength(
        fullName,
        FIELD_LIMITS.fullName,
        "Full name"
      ),
      companyName: validateTextLength(
        companyName,
        FIELD_LIMITS.company,
        "Company name"
      ),
      mcNumber: validateMcNumber(mcNumber),
      dotNumber: validateDotNumber(dotNumber),
    };
    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const saveProfile = async (skipped = false) => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    if (!skipped && !validate()) return;

    setLoading(true);
    setFormError(null);

    const response = await fetch("/api/auth/complete-profile-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        skipped
          ? { skipped: true }
          : {
              fullName,
              companyName,
              mcNumber,
              dotNumber,
              ein,
            }
      ),
    });

    setLoading(false);

    if (!response.ok) {
      setFormError(
        "We could not save your profile. Check your connection and try again."
      );
      return;
    }

    await refreshProfile();
    router.replace(APP_ROUTES.dashboard);
  };

  if (authLoading || (user && !profile) || (user && profile && !profileResynced && !hasCompletedOnboarding(profile))) {
    return <RouteGuardLoading />;
  }

  return (
    <div className="tv-auth-page">
      <AuthBrandHeader />
      <div className="mb-8">
        <p className="tv-caption">One-time setup</p>
        <h1 className="tv-page-title mt-1">Profile setup</h1>
        <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">
          Add your authority numbers so invoices and documents are ready when
          you need them.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <TvInput
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={() =>
            setFullName((value) => sanitizeText(value))
          }
          error={errors.fullName}
          counter={getTextCounter(fullName, FIELD_LIMITS.fullName)}
        />
        <TvInput
          label="Company name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          onBlur={() =>
            setCompanyName((value) => sanitizeText(value))
          }
          error={errors.companyName}
          counter={getTextCounter(companyName, FIELD_LIMITS.company)}
        />
        <TvInput
          label="MC Number"
          value={mcNumber}
          onChange={(event) =>
            setMcNumber(formatMcNumber(event.target.value))
          }
          error={errors.mcNumber}
          helper="Format: MC-123456 or MC-1234567"
        />
        <TvInput
          label="DOT Number"
          value={dotNumber}
          onChange={(event) =>
            setDotNumber(formatDotNumber(event.target.value))
          }
          error={errors.dotNumber}
          helper="Format: DOT-1234567"
        />
        <TvInput
          label="EIN (Tax ID)"
          value={ein}
          onChange={(event) => setEin(event.target.value)}
          onBlur={() => setEin((value) => sanitizeText(value))}
          placeholder="XX-XXXXXXX"
        />

        {formError ? (
          <div className="tv-error-state px-4 py-3">
            <p className="text-[14px]">{formError}</p>
          </div>
        ) : null}

        <TvButton loading={loading} onClick={() => saveProfile(false)}>
          Save profile
        </TvButton>
        <TvButton variant="ghost" onClick={() => saveProfile(true)}>
          Skip for now
        </TvButton>
      </div>
    </div>
  );
}

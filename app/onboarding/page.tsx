"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { TvButton } from "@/components/tv/tv-button";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import { getPostAuthRedirect, hasCompletedOnboarding } from "@/lib/auth-helpers";
import type { UserProfile } from "@/types/database";

const steps = [
  {
    title: "Fight for your money",
    body: "T-Vault documents detention time, tracks unpaid invoices, and shows what you really net per mile.",
  },
  {
    title: "Built for the cab",
    body: "Big buttons, glove-friendly taps, and fast screens designed for tired shifts on the road.",
  },
  {
    title: "Your data stays yours",
    body: "Your load records are encrypted, never sold, and always under your control.",
  },
] as const;

function onboardingErrorMessage(status: number, code?: string): string {
  if (status === 401) {
    return "Your session expired. Sign in again and retry.";
  }
  if (status === 404 || code === "profile_missing") {
    return "We could not find your profile. Pull down to refresh or sign out and sign back in.";
  }
  if (status === 429) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  return "We could not save your progress. Check your connection and try again.";
}

async function ensureUserProfile(
  user: User,
  refreshProfile: () => Promise<UserProfile | null>
): Promise<UserProfile | null> {
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Driver";

  console.info("[onboarding] ensureUserProfile: calling complete-signup");

  const response = await fetch("/api/auth/complete-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName,
      referredBy: user.user_metadata?.referred_by,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    console.error(
      "[onboarding] complete-signup failed:",
      response.status,
      body.error ?? body
    );
    return null;
  }

  console.info("[onboarding] complete-signup ok, refreshing profile");
  return refreshProfile();
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, patchProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ensuringProfile = useRef(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    if (hasCompletedOnboarding(profile)) {
      const destination = getPostAuthRedirect(profile);
      console.info("[onboarding] Already complete, redirecting to", destination);
      router.replace(destination);
    }
  }, [profile, router, user]);

  useEffect(() => {
    if (!user || profile || ensuringProfile.current) return;

    ensuringProfile.current = true;

    void (async () => {
      const ensured = await ensureUserProfile(user, refreshProfile);
      if (!ensured) {
        setError(
          "We could not finish setting up your account. Check your connection and try again."
        );
      }
      ensuringProfile.current = false;
    })();
  }, [profile, refreshProfile, user]);

  const finishOnboarding = async () => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    setLoading(true);
    setError(null);
    console.info("[onboarding] finishOnboarding started", {
      step,
      hasProfile: Boolean(profile),
    });

    try {
      let activeProfile = profile;

      if (!activeProfile) {
        activeProfile = await ensureUserProfile(user, refreshProfile);
        if (!activeProfile) {
          setError(
            "We could not finish setting up your account. Check your connection and try again."
          );
          return;
        }
      }

      console.info("[onboarding] calling complete-onboarding");
      const response = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: UserProfile;
      };

      if (!response.ok) {
        console.error(
          "[onboarding] complete-onboarding failed:",
          response.status,
          body.error ?? body
        );
        setError(onboardingErrorMessage(response.status, body.error));
        return;
      }

      const updatedProfile: UserProfile = body.profile
        ? { ...activeProfile, ...body.profile, onboarding_completed: true }
        : { ...activeProfile, onboarding_completed: true };

      const destination = getPostAuthRedirect(updatedProfile);
      console.info("[onboarding] complete, redirecting to", destination, updatedProfile);

      patchProfile(updatedProfile);
      router.replace(destination);
    } catch (err) {
      console.error("[onboarding] finishOnboarding unexpected error:", err);
      setError(
        "Something went wrong while saving your progress. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tv-auth-page">
      <AuthBrandHeader />
      <div className="flex flex-1 flex-col justify-center">
        <Image
          src="/icon.png"
          alt=""
          width={80}
          height={80}
          className="mx-auto mb-8 block size-20"
          priority
        />
        <p className="tv-caption">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="tv-page-title mt-2">{current.title}</h1>
        <p className="tv-body mt-4 leading-7 text-[var(--color-text-secondary)]">
          {current.body}
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {error ? (
          <div className="tv-error-state px-4 py-3">
            <p className="text-[14px]">{error}</p>
          </div>
        ) : null}

        {!isLast ? (
          <TvButton onClick={() => setStep((value) => value + 1)}>
            Continue
          </TvButton>
        ) : (
          <TvButton loading={loading} onClick={() => void finishOnboarding()}>
            Get started
          </TvButton>
        )}
        {!isLast ? (
          <TvButton variant="ghost" onClick={() => void finishOnboarding()}>
            Skip tour
          </TvButton>
        ) : null}
      </div>
    </div>
  );
}

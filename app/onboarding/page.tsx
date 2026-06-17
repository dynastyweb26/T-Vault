"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TvButton } from "@/components/tv/tv-button";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { createClient } from "@/lib/supabase/client";
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
      router.replace(getPostAuthRedirect(profile));
    }
  }, [profile, router, user]);

  useEffect(() => {
    if (!user || profile || ensuringProfile.current) return;

    ensuringProfile.current = true;

    const ensureProfile = async () => {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Driver";

      const response = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          referredBy: user.user_metadata?.referred_by,
        }),
      });

      if (response.ok) {
        await refreshProfile();
      } else {
        setError(
          "We could not finish setting up your account. Check your connection and try again."
        );
      }

      ensuringProfile.current = false;
    };

    void ensureProfile();
  }, [profile, refreshProfile, user]);

  const finishOnboarding = async () => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    setLoading(true);
    setError(null);

    if (!profile) {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Driver";

      const signupResponse = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          referredBy: user.user_metadata?.referred_by,
        }),
      });

      if (!signupResponse.ok) {
        setLoading(false);
        setError(
          "We could not save your progress. Check your connection and try again."
        );
        return;
      }

      await refreshProfile();
    }

    const response = await fetch("/api/auth/complete-onboarding", {
      method: "POST",
    });

    if (!response.ok) {
      setLoading(false);
      setError(
        "We could not save your progress. Check your connection and try again."
      );
      return;
    }

    const { data: updatedProfile } = await createClient()
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    patchProfile({ onboarding_completed: true, ...(updatedProfile ?? {}) });
    setLoading(false);
    router.push(getPostAuthRedirect(updatedProfile as UserProfile | null));
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
          <TvButton loading={loading} onClick={finishOnboarding}>
            Get started
          </TvButton>
        )}
        {!isLast ? (
          <TvButton variant="ghost" onClick={finishOnboarding}>
            Skip tour
          </TvButton>
        ) : null}
      </div>
    </div>
  );
}

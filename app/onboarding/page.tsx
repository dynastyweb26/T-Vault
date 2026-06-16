"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Shield, Smartphone } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import { hasCompletedOnboarding } from "@/lib/auth-helpers";

const steps = [
  {
    title: "Fight for your money",
    body: "T-Vault documents detention time, tracks unpaid invoices, and shows what you really net per mile.",
    icon: DollarSign,
  },
  {
    title: "Built for the cab",
    body: "Big buttons, glove-friendly taps, and fast screens designed for tired shifts on the road.",
    icon: Smartphone,
  },
  {
    title: "Your data stays yours",
    body: "Your load records are encrypted, never sold, and always under your control.",
    icon: Shield,
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, patchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    if (hasCompletedOnboarding(profile)) {
      router.replace(APP_ROUTES.dashboard);
    }
  }, [profile, router, user]);

  const finishOnboarding = async () => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    if (updateError) {
      setLoading(false);
      setError(
        "We could not save your progress. Check your connection and try again."
      );
      return;
    }

    patchProfile({ onboarding_completed: true });
    setLoading(false);
    router.push(APP_ROUTES.dashboard);
  };

  return (
    <div className="tv-auth-page">
      <AuthBrandHeader />
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 flex size-20 items-center justify-center rounded-2xl tv-glass-card">
          <Icon
            className="size-10 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
        </div>
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TvButton } from "@/components/tv/tv-button";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import { getPostAuthRedirect } from "@/lib/auth-helpers";
import {
  getSplashAnimationStartedAt,
  markSplashNavigation,
  waitForSplashMinimum,
} from "@/lib/splash-flow";
import type { UserProfile } from "@/types/database";

export function SplashBoot() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [status, setStatus] = useState("Checking your account...");
  const [failed, setFailed] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const navigatingRef = useRef(false);
  const bootInFlightRef = useRef(false);

  const boot = useCallback(async () => {
    if (authLoading || navigatingRef.current || bootInFlightRef.current) {
      return;
    }

    bootInFlightRef.current = true;

    try {
      setFailed(false);
      setStatus("Checking your account...");

      if (!user) {
        router.replace(APP_ROUTES.signIn);
        return;
      }

      let resolvedProfile = profile ?? (await refreshProfile());

      if (!resolvedProfile) {
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
          setFailed(true);
          setStatus("We could not finish setting up your account. Try again.");
          return;
        }

        resolvedProfile = await refreshProfile();
      }

      if (!resolvedProfile) {
        setFailed(true);
        setStatus("We could not finish setting up your account. Try again.");
        return;
      }

      setStatus("Loading your command center...");
      await waitForSplashMinimum(getSplashAnimationStartedAt());
      navigatingRef.current = true;
      markSplashNavigation();
      router.replace(getPostAuthRedirect(resolvedProfile as UserProfile));
    } finally {
      bootInFlightRef.current = false;
    }
  }, [authLoading, profile, refreshProfile, router, user]);

  useEffect(() => {
    if (authLoading || failed) return;
    void boot();
  }, [authLoading, boot, bootAttempt, failed]);

  const handleRetry = () => {
    navigatingRef.current = false;
    setBootAttempt((attempt) => attempt + 1);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-5 pb-[max(10.5rem,calc(env(safe-area-inset-bottom)+9rem))] text-center">
      <p className="tv-caption pointer-events-auto text-[#aaaaaa]">{status}</p>
      {failed ? (
        <div className="pointer-events-auto mt-4">
          <TvButton variant="secondary" onClick={handleRetry}>
            Try again
          </TvButton>
        </div>
      ) : (
        <div className="tv-skeleton pointer-events-none mt-4 h-1 w-20 rounded-full" />
      )}
    </div>
  );
}

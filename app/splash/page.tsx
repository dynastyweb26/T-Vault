"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TvButton } from "@/components/tv/tv-button";
import { SplashTruckAnimation } from "@/components/splash/splash-truck-animation";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import { getPostAuthRedirect } from "@/lib/auth-helpers";
import type { UserProfile } from "@/types/database";

export default function SplashPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState("Checking your account...");
  const [failed, setFailed] = useState(false);

  const boot = useCallback(async () => {
    setFailed(false);
    setStatus("Checking your account...");

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    let { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!profile) {
      const fullName =
        (currentUser.user_metadata?.full_name as string | undefined) ||
        currentUser.email?.split("@")[0] ||
        "Driver";

      const signupResponse = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          referredBy: currentUser.user_metadata?.referred_by,
        }),
      });

      if (!signupResponse.ok) {
        setFailed(true);
        setStatus("We could not finish setting up your account. Try again.");
        return;
      }

      const refreshed = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();
      profile = refreshed.data;
    }

    if (!profile) {
      setFailed(true);
      setStatus("We could not finish setting up your account. Try again.");
      return;
    }

    setStatus("Loading your command center...");
    router.replace(getPostAuthRedirect(profile as UserProfile));
  }, [router, supabase]);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <SplashTruckAnimation />

      <div className="pointer-events-none relative z-10 flex min-h-dvh flex-col items-center justify-end px-5 pb-[max(10.5rem,calc(env(safe-area-inset-bottom)+9rem))] text-center">
        <p className="tv-caption pointer-events-auto text-[#aaaaaa]">
          {status}
        </p>
        {failed ? (
          <div className="pointer-events-auto mt-4">
            <TvButton variant="secondary" onClick={() => void boot()}>
              Try again
            </TvButton>
          </div>
        ) : (
          <div className="tv-skeleton pointer-events-none mt-4 h-1 w-20 rounded-full" />
        )}
      </div>
    </div>
  );
}

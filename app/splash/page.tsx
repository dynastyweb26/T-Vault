"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TvButton } from "@/components/tv/tv-button";
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-5 text-center">
      <div className="flex flex-col items-center">
        <Image
          src="/icon.png"
          alt=""
          width={120}
          height={120}
          className="mx-auto mb-8 block size-[120px] rounded-[28px]"
          priority
        />

        <h1
          className="w-[200px] text-[32px] font-extrabold leading-none tracking-tight"
          style={{
            background: "var(--gold-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          T-Vault
        </h1>

        <p className="tv-body mt-4 max-w-[280px] text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          Your business command center for the road.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[max(3rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-4">
        <p className="tv-caption">{status}</p>
        {failed ? (
          <TvButton variant="secondary" onClick={() => void boot()}>
            Try again
          </TvButton>
        ) : (
          <div className="tv-skeleton h-1 w-20 rounded-full" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import { getPostAuthRedirect } from "@/lib/auth-helpers";
import type { UserProfile } from "@/types/database";

export default function SplashPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState("Checking your account...");

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!currentUser) {
        router.replace(APP_ROUTES.signIn);
        return;
      }

      const { data: profile } = await supabase
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
          setStatus("We could not finish setting up your account. Try again.");
          return;
        }
      }

      const { data: refreshedProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      setStatus("Loading your command center...");
      router.replace(getPostAuthRedirect(refreshedProfile as UserProfile | null));
    };

    const timer = setTimeout(boot, 900);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router, supabase]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-5 text-center">
      <div className="flex flex-col items-center">
        <div className="tv-gold-glow overflow-hidden rounded-[28px]">
          <Image
            src="/icon.png"
            alt=""
            width={120}
            height={120}
            className="size-[120px] rounded-[28px]"
            priority
          />
        </div>

        <h1
          className="mt-6 w-[200px] text-[32px] font-extrabold leading-none tracking-tight"
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
        <div className="tv-skeleton h-1 w-20 rounded-full" />
      </div>
    </div>
  );
}

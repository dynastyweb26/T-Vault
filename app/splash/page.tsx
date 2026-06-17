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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-5 text-center">
      <Image
        src="/logo.jpeg"
        alt="T-Vault"
        width={240}
        height={64}
        className="mb-8 h-16 w-auto"
        priority
      />
      <p className="tv-body max-w-sm text-[var(--color-text-secondary)]">
        Your business command center for the road.
      </p>
      <p className="tv-caption mt-8">{status}</p>
      <div className="tv-skeleton mt-6 h-2 w-24 rounded-full" />
    </div>
  );
}

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-5 text-center">
      <div className="flex flex-col items-center">
        <Image
          src="/icon.jpeg"
          alt="T-Vault"
          width={120}
          height={120}
          className="h-[120px] w-[120px]"
          priority
        />

        <Image
          src="/logo.jpeg"
          alt="T-Vault"
          width={220}
          height={64}
          className="mt-8 w-[220px] h-auto"
          priority
        />

        <p className="mt-5 max-w-[280px] text-[16px] font-light leading-relaxed text-white">
          Your business command center for the road.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[max(3rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#B8960C]">
          {status}
        </p>
        <div className="relative h-[2px] w-[160px] overflow-hidden rounded-full bg-[#B8960C]/15">
          <div className="tv-loading-bar" />
        </div>
      </div>
    </div>
  );
}

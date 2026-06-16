"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
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
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        router.replace(APP_ROUTES.signIn);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile) {
        const fullName =
          (session.user.user_metadata?.full_name as string | undefined) ||
          session.user.email?.split("@")[0] ||
          "Driver";

        await fetch("/api/auth/complete-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            referredBy: session.user.user_metadata?.referred_by,
          }),
        });
      }

      const { data: refreshedProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <div className="tv-brushed-gold-btn tv-gold-glow mb-8 flex size-24 items-center justify-center rounded-2xl">
        <Wallet
          className="size-12 text-black"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-accent)]">
        T-Vault
      </h1>
      <p className="mt-3 max-w-sm text-[17px] text-[var(--color-text-secondary)]">
        Your business command center for the road.
      </p>
      <p className="tv-caption mt-8">{status}</p>
      <div className="tv-skeleton mt-6 h-2 w-24 rounded-full" />
    </div>
  );
}

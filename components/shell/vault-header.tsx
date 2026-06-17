"use client";

import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants";

export function VaultHeader() {
  const { profile } = useAuth();

  return (
    <header className="tv-frosted-bar sticky top-0 z-50 border-b px-5 py-4">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-xl shadow-[var(--shadow-gold)]"
            aria-hidden
          />
          <h1 className="tv-section-header text-[var(--color-accent)] tv-glow-gold-icon">
            T-Vault
          </h1>
        </div>

        <Link
          href={APP_ROUTES.profile}
          aria-label="Profile"
          className="tv-icon-btn overflow-hidden rounded-full border border-[var(--color-accent)]/30 p-0.5 shadow-[var(--shadow-gold)]"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[11px] font-bold uppercase text-[var(--color-accent)]">
            {(profile?.full_name || profile?.email || "T")[0]}
          </div>
        </Link>
      </div>
    </header>
  );
}

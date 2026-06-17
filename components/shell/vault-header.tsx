"use client";

import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants";

export function VaultHeader() {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-shell-border)] bg-[var(--color-bg)]/95 px-5 py-4 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.jpeg"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-lg"
            aria-hidden
          />
          <h1 className="tv-section-header tracking-tight text-[var(--color-accent)]">
            T-Vault
          </h1>
        </div>

        <Link
          href={APP_ROUTES.profile}
          aria-label="Profile"
          className="tv-icon-btn overflow-hidden rounded-full border border-[var(--color-accent)]/20 p-0.5"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[11px] font-bold uppercase text-[var(--color-accent)]">
            {(profile?.full_name || profile?.email || "T")[0]}
          </div>
        </Link>
      </div>
    </header>
  );
}

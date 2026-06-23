"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Wallet, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import { shouldShowVaultIntroBanner } from "@/lib/profile/vault-intro";

export function VaultIntroBanner() {
  const router = useRouter();
  const { user, profile, patchProfile } = useAuth();
  const markingRef = useRef(false);

  const markSeen = useCallback(async (): Promise<boolean> => {
    if (markingRef.current || !user || !profile) return false;

    markingRef.current = true;
    try {
      const response = await fetch("/api/profile/dismiss-vault-intro", {
        method: "POST",
      });

      if (!response.ok) {
        markingRef.current = false;
        return false;
      }

      patchProfile({ has_seen_vault_intro: true });
      return true;
    } catch {
      markingRef.current = false;
      return false;
    }
  }, [patchProfile, profile, user]);

  const dismiss = useCallback(async () => {
    await markSeen();
  }, [markSeen]);

  const goToDocuments = useCallback(async () => {
    const ok = await markSeen();
    if (ok) {
      router.push(APP_ROUTES.documents);
    }
  }, [markSeen, router]);

  if (!shouldShowVaultIntroBanner(profile)) {
    return null;
  }

  return (
    <div
      role="status"
      className="tv-vault-intro-banner tv-glass-card mb-3 rounded-xl border border-[var(--color-accent)]/25 p-4 shadow-[var(--shadow-gold)]"
    >
      <div className="flex items-start gap-3">
        <Wallet
          className="mt-1 size-5 shrink-0 text-[var(--color-accent)]"
          strokeWidth={2}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-5 text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">
              Store your business documents securely
            </span>{" "}
            — upload insurance, registration, and permits in My Documents.
            We&apos;ll remind you before anything expires.
          </p>
          <button
            type="button"
            onClick={() => void goToDocuments()}
            className="tv-accent-outline-btn mt-3 inline-flex min-h-14 items-center justify-center rounded-xl px-4 text-[14px] font-semibold"
          >
            Go to My Documents
          </button>
        </div>
        <button
          type="button"
          className="tv-icon-btn shrink-0 rounded-full text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] min-h-14 min-w-14"
          aria-label="Dismiss document vault intro"
          onClick={() => void dismiss()}
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { triggerHaptic } from "@/lib/haptics";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  PRO_FEATURES,
  PRO_MONTHLY_PRICE_LABEL,
  PRO_PAYWALL_BACKGROUND_IMAGE,
} from "@/lib/pro-pricing";
import {
  redeemCodeErrorMessage,
  redeemProCode,
} from "@/lib/pro-access";

export type ProPaywallStats = {
  totalEarned?: number;
  loadsDocumented?: number;
  invoicesGenerated?: number;
  timeSavedMinutes?: number;
};

export type ProPaywallProps = {
  open: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  variant?: "post-first-load" | "generic";
  stats?: ProPaywallStats;
  headline?: string;
  subheadline?: string;
};

export function ProPaywall({
  open,
  onClose,
  onDismiss,
  variant = "generic",
  stats,
  headline,
  subheadline,
}: ProPaywallProps) {
  const { refreshProAccess } = useAuth();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentNoticeVisible, setPaymentNoticeVisible] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPaymentLoading(false);
      setPaymentNoticeVisible(false);
      setShowCodeInput(false);
      setCode("");
      setCodeLoading(false);
      setCodeError(null);
      setCodeSuccess(null);
    }
  }, [open]);

  if (!open) return null;

  const resolvedHeadline =
    headline ??
    (variant === "post-first-load"
      ? "Your first load is in the books."
      : "Unlock T-Vault Pro");

  const resolvedSubheadline =
    subheadline ??
    (variant === "post-first-load"
      ? "Keep building with T-Vault Pro"
      : "Everything you need to run loads without limits.");

  const handleStartPro = async () => {
    setPaymentLoading(true);
    triggerHaptic("medium");
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setPaymentLoading(false);
    setPaymentNoticeVisible(true);
    setShowCodeInput(true);
    setCodeError(null);
    setCodeSuccess(null);
  };

  const handleRedeemCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setCodeLoading(true);
    setCodeError(null);
    setCodeSuccess(null);

    const supabase = createClient();
    const result = await redeemProCode(supabase, trimmed);

    if (!result.ok) {
      setCodeError(redeemCodeErrorMessage(result.error));
      setCodeLoading(false);
      return;
    }

    await refreshProAccess();
    setCodeSuccess(
      result.alreadyRedeemed
        ? "You already redeemed this code. Pro access is active."
        : "Pro access unlocked."
    );
    triggerHaptic("medium");
    setCodeLoading(false);

    window.setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleMaybeLater = () => {
    triggerHaptic("light");
    onDismiss?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="T-Vault Pro"
    >
      <div className="absolute inset-0 bg-[var(--color-bg)]">
        {/* Drop asset at public/paywall-road-horizon.png */}
        <img
          src={PRO_PAYWALL_BACKGROUND_IMAGE}
          alt=""
          className="absolute inset-0 size-full object-cover object-bottom"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-bg) 35%, transparent), var(--color-bg))",
          }}
        />
      </div>

      <div className="relative flex min-h-full flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex-1">
          <h2 className="tv-section-header text-left">{resolvedHeadline}</h2>

          {variant === "post-first-load" && stats ? (
            <div className="mt-4 rounded-2xl tv-glass-card border border-[var(--color-shell-border)] p-5 text-left">
              {stats.totalEarned !== undefined ? (
                <p className="tv-tabular text-[var(--color-accent)]">
                  Total earned: {formatCurrency(stats.totalEarned)}
                </p>
              ) : null}
              {stats.loadsDocumented !== undefined ? (
                <p className="mt-2 text-[var(--color-text-secondary)]">
                  {stats.loadsDocumented} load
                  {stats.loadsDocumented === 1 ? "" : "s"} documented
                </p>
              ) : null}
              {stats.invoicesGenerated !== undefined ? (
                <p className="text-[var(--color-text-secondary)]">
                  {stats.invoicesGenerated} invoice
                  {stats.invoicesGenerated === 1 ? "" : "s"} generated
                </p>
              ) : null}
              {stats.timeSavedMinutes !== undefined ? (
                <p className="text-[var(--color-text-secondary)]">
                  Estimated time saved: ~{stats.timeSavedMinutes} minutes of
                  paperwork
                </p>
              ) : null}
            </div>
          ) : null}

          <h3 className="tv-section-header mt-6 text-left">{resolvedSubheadline}</h3>

          <p className="tv-tabular mt-2 text-[36px] font-bold text-[var(--color-accent)]">
            {PRO_MONTHLY_PRICE_LABEL}
          </p>
          <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">
            Cancel anytime. No commitments.
          </p>

          <ul className="mt-6 space-y-3">
            {PRO_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-left text-[16px] text-[var(--color-text-secondary)]"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15">
                  <Check
                    className="size-3.5 text-[var(--color-accent)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative mt-8 -mx-5 px-5 pt-10 pb-2"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--color-bg) 55%)",
          }}
        >
          <TvButton loading={paymentLoading} onClick={handleStartPro}>
            Start Pro — {PRO_MONTHLY_PRICE_LABEL}
          </TvButton>

          {paymentNoticeVisible ? (
            <div className="relative mt-4 flex flex-col items-center">
              <p
                role="status"
                className="w-full rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-4 py-3 text-center text-[15px] leading-snug text-[var(--color-text-secondary)]"
              >
                Pro payments launching soon — have a code? Use it below.
              </p>
              <span
                aria-hidden
                className="mt-1 block size-0 border-x-8 border-t-8 border-x-transparent border-t-[var(--color-accent)]/25"
              />
            </div>
          ) : null}

          {!showCodeInput ? (
            <button
              type="button"
              className={`min-h-11 w-full text-center text-[15px] text-[var(--color-accent)] underline-offset-2 hover:underline ${paymentNoticeVisible ? "mt-2" : "mt-4"}`}
              onClick={() => {
                setShowCodeInput(true);
                setCodeError(null);
                setCodeSuccess(null);
              }}
            >
              Have a code?
            </button>
          ) : (
            <div
              className={`space-y-3 text-left ${paymentNoticeVisible ? "mt-2" : "mt-4"}`}
            >
              <TvInput
                label="Pro code"
                borderVariant="gold"
                labelVariant="readable"
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                error={codeError}
              />
              {codeSuccess ? (
                <p className="text-[14px] text-[var(--color-success-text)]">
                  {codeSuccess}
                </p>
              ) : null}
              <TvButton
                variant="secondary"
                loading={codeLoading}
                disabled={!code.trim()}
                onClick={() => {
                  void handleRedeemCode();
                }}
              >
                Redeem code
              </TvButton>
            </div>
          )}

          <button
            type="button"
            className="mt-4 min-h-11 w-full text-center text-[14px] text-[var(--color-text-muted)]"
            onClick={handleMaybeLater}
          >
            Maybe later — keep 1 load
          </button>
        </div>
      </div>
    </div>
  );
}

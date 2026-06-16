"use client";

import { Bebas_Neue } from "next/font/google";
import { Gift, Users } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { useAuth } from "@/components/providers/auth-provider";
import { triggerHaptic } from "@/lib/haptics";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

const STEPS = [
  { title: "Share your code", desc: "Send it to drivers you know" },
  { title: "They sign up", desc: "They enter your code at registration" },
  { title: "You both get credit", desc: "Rewards applied to both accounts" },
];

export function ReferralView() {
  const { profile } = useAuth();
  const code = profile?.referral_code ?? "TVT-XXX-0000";

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    triggerHaptic("medium");
  };

  const share = async () => {
    const message = `I've been using T-Vault to keep my loads organized. Here's my invite code: ${code} — try it at TVT.app`;
    if (navigator.share) {
      await navigator.share({ text: message });
    } else {
      await navigator.clipboard.writeText(message);
    }
    triggerHaptic("medium");
  };

  return (
    <>
      <AppHeader title="Invite a Driver" />
      <div className="mt-6 flex flex-col gap-6 px-5 pb-8">
        <h2 className="tv-page-title">Invite drivers. Get rewards.</h2>

        <button
          type="button"
          onClick={copyCode}
          className="tv-brushed-gold-btn tv-gold-glow rounded-2xl p-6 text-center"
        >
          <p className="tv-caption text-[var(--color-on-accent)] opacity-80">
            YOUR CODE
          </p>
          <p
            className={`${bebasNeue.className} mt-2 text-[40px] leading-none tracking-wider text-[var(--color-on-accent)]`}
          >
            {code}
          </p>
          <p className="mt-3 text-[14px] text-[var(--color-on-accent)] opacity-80">
            Tap to copy
          </p>
        </button>

        <TvButton onClick={share}>Share</TvButton>

        <section className="flex flex-col gap-4">
          <p className="tv-section-header">How it works</p>
          {STEPS.map((step, i) => (
            <div key={step.title} className="tv-glass-card flex gap-3 rounded-2xl p-4">
              <span className="tv-tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                {i + 1}
              </span>
              <div>
                <p className="tv-card-title text-[17px]">{step.title}</p>
                <p className="text-[16px] text-[var(--color-text-secondary)]">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        <div className="tv-glass-card flex items-center gap-3 rounded-2xl p-4">
          <Users
            className="size-6 text-[var(--color-accent)]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-[16px] text-[var(--color-text-secondary)]">
            Every driver you invite helps build a stronger network.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <Gift className="size-5" strokeWidth={2} aria-hidden />
          <span className="text-[16px]">Your code: {code}</span>
        </div>
      </div>
    </>
  );
}

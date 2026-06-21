"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { upsertBrokerStarRating } from "@/lib/brokers/ratings";
import { TvButton } from "@/components/tv/tv-button";
import { cn } from "@/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

interface StarRatingRowProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  name: string;
}

function StarRatingRow({ label, value, onChange, name }: StarRatingRowProps) {
  const groupId = useId();

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="tv-label">{label}</legend>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex items-center gap-1"
      >
        <span id={groupId} className="sr-only">
          {label}
        </span>
        {STAR_VALUES.map((star) => {
          const filled = value !== null && star <= value;
          return (
            <button
              key={star}
              type="button"
              name={name}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              className="tv-icon-btn text-[var(--color-accent)]"
              onClick={() => onChange(star)}
            >
              <Star
                className={cn("size-8", filled ? "fill-current" : "fill-none")}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface BrokerRatingModalProps {
  open: boolean;
  brokerId: string;
  brokerName: string;
  onSubmitted: () => void;
}

export function BrokerRatingModal({
  open,
  brokerId,
  brokerName,
  onSubmitted,
}: BrokerRatingModalProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [paidOnTimeStars, setPaidOnTimeStars] = useState<number | null>(null);
  const [easeOfWorkStars, setEaseOfWorkStars] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    paidOnTimeStars !== null &&
    easeOfWorkStars !== null &&
    !saving;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPaidOnTimeStars(null);
      setEaseOfWorkStars(null);
      setError(null);
      setSaving(false);
      const frame = requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 340);
    document.body.style.overflow = "";
    return () => window.clearTimeout(timer);
  }, [open, brokerId]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || paidOnTimeStars === null || easeOfWorkStars === null) {
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Could not save rating. Try again.");
      return;
    }

    const result = await upsertBrokerStarRating(supabase, user.id, {
      brokerId,
      paidOnTimeStars,
      easeOfWorkStars,
    });

    setSaving(false);

    if (!result.ok) {
      setError("Could not save rating. Try again.");
      return;
    }

    onSubmitted();
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "tv-sheet-overlay fixed inset-0 z-[80] flex items-end",
        visible ? "tv-sheet-overlay-open" : "tv-sheet-overlay-closed"
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Rate ${brokerName}`}
        className={cn(
          "tv-sheet-panel w-full max-h-[92dvh] overflow-y-auto border-b-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
          visible ? "tv-sheet-panel-open" : "tv-sheet-panel-closed",
          "border-t border-[var(--color-shell-border)] bg-[var(--color-panel-solid)]"
        )}
      >
        <div className="tv-sheet-handle mx-auto mb-5" />
        <div className="mb-4">
          <h2 className="tv-section-header">Rate this broker</h2>
          <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">
            {brokerName}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <StarRatingRow
            label="Paid on time"
            name="paid-on-time"
            value={paidOnTimeStars}
            onChange={setPaidOnTimeStars}
          />
          <StarRatingRow
            label="Ease of work"
            name="ease-of-work"
            value={easeOfWorkStars}
            onChange={setEaseOfWorkStars}
          />

          {error ? (
            <p className="text-[14px] text-[var(--color-danger-text)]">{error}</p>
          ) : null}

          <TvButton loading={saving} disabled={!canSubmit} onClick={handleSubmit}>
            Submit rating
          </TvButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

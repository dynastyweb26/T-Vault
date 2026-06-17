"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TvButton } from "@/components/tv/tv-button";
import { TvTextarea } from "@/components/tv/tv-textarea";
import { createClient } from "@/lib/supabase/client";
import { saveJobBrokerRating } from "@/lib/loads/mark-paid";
import { TEXT_LIMITS } from "@/lib/constants";
import type { Job } from "@/types/jobs";
import type { BrokerRatingOutcome } from "@/types/job-folder";

interface BrokerRatingPromptProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const RATING_OPTIONS: {
  value: BrokerRatingOutcome;
  label: string;
  icon: typeof CheckCircle;
  color: string;
}[] = [
  {
    value: "on_time",
    label: "Paid on time",
    icon: CheckCircle,
    color: "var(--color-success-text)",
  },
  {
    value: "late",
    label: "Paid late",
    icon: Clock,
    color: "var(--color-warning-text)",
  },
  {
    value: "problem",
    label: "Payment problem",
    icon: AlertCircle,
    color: "var(--color-danger-text)",
  },
];

export function BrokerRatingPrompt({
  job,
  open,
  onClose,
  onSaved,
}: BrokerRatingPromptProps) {
  const [selected, setSelected] = useState<BrokerRatingOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const brokerName = job?.broker_name?.trim();

  const handleSave = async () => {
    if (!job || !selected || !brokerName) {
      onClose();
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    await saveJobBrokerRating(supabase, user.id, job, selected, notes);
    setSaving(false);
    setSelected(null);
    setNotes("");
    onSaved?.();
    onClose();
  };

  const handleSkip = () => {
    setSelected(null);
    setNotes("");
    onClose();
  };

  if (!job || !brokerName) return null;

  return (
    <BottomSheet
      open={open}
      onClose={handleSkip}
      title={`How did ${brokerName} do?`}
      ariaLabel="Rate broker payment"
      surface="solid"
    >
      <div className="flex flex-col gap-3">
        {RATING_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={`flex h-20 items-center justify-center gap-3 rounded-2xl border transition-colors ${
                isSelected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-shell-border)] bg-[var(--color-surface)]"
              }`}
            >
              <Icon
                className="size-8"
                style={{ color: option.color }}
                strokeWidth={2}
                aria-hidden
              />
              <span className="tv-body font-medium">{option.label}</span>
            </button>
          );
        })}

        <TvTextarea
          label="Any notes?"
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value.slice(0, TEXT_LIMITS.brokerRatingNotes))
          }
          placeholder="Optional"
          rows={3}
        />

        <TvButton loading={saving} disabled={!selected} onClick={handleSave}>
          Save Rating
        </TvButton>
        <button
          type="button"
          onClick={handleSkip}
          className="tv-body min-h-11 text-[var(--color-text-muted)]"
        >
          Skip
        </button>
      </div>
    </BottomSheet>
  );
}

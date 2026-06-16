"use client";

import Link from "next/link";
import { Mic } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";

export function VoiceNoteShortcut() {
  return (
    <Link
      href={APP_ROUTES.voiceNote}
      aria-label="Record voice note"
      className="tv-glass-card tv-pressable flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl py-4 transition-opacity duration-150 active:opacity-90"
    >
      <Mic
        className="size-7 text-[var(--color-accent)]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="text-[14px] font-medium text-[var(--color-accent)]">
        Voice Note
      </span>
    </Link>
  );
}

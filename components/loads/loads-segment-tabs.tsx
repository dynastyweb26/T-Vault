"use client";

import type { LoadsTabId } from "@/lib/loads/constants";
import { LOADS_TABS } from "@/lib/loads/constants";

interface LoadsSegmentTabsProps {
  active: LoadsTabId;
  onChange: (tab: LoadsTabId) => void;
}

export function LoadsSegmentTabs({ active, onChange }: LoadsSegmentTabsProps) {
  return (
    <div className="flex border-b border-[var(--color-shell-border)]">
      {LOADS_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex h-11 flex-1 items-center justify-center text-[15px] font-medium transition-colors ${
              isActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {tab.label}
            {isActive ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-accent)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

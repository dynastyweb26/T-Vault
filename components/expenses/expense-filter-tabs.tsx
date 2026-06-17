"use client";

import {
  EXPENSE_FILTER_TABS,
  type ExpenseFilterId,
} from "@/lib/expenses/constants";

interface ExpenseFilterTabsProps {
  active: ExpenseFilterId;
  onChange: (filter: ExpenseFilterId) => void;
}

export function ExpenseFilterTabs({ active, onChange }: ExpenseFilterTabsProps) {
  return (
    <div className="scrollbar-none -mx-5 overflow-x-auto px-5">
      <div className="flex min-w-max gap-1">
        {EXPENSE_FILTER_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex h-11 shrink-0 items-center px-4 text-[15px] font-medium transition-colors ${
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
    </div>
  );
}

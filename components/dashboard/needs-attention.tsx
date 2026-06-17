import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { AttentionItem } from "@/types/jobs";

interface NeedsAttentionProps {
  items: AttentionItem[];
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  if (items.length === 0) {
    return (
      <section data-tour="dashboard-needs-attention">
        <h2 className="tv-section-header mb-3 flex items-center gap-2 text-[var(--color-text-secondary)]">
          <AlertCircle className="size-5" strokeWidth={2} aria-hidden />
          Needs Attention
        </h2>
        <div className="tv-glass-card rounded-2xl px-4 py-3">
          <p className="tv-body text-[14px] text-[var(--color-text-secondary)]">
            You&apos;re all caught up — nothing needs action right now.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section data-tour="dashboard-needs-attention">
      <h2 className="tv-section-header mb-3 flex items-center gap-2 text-[var(--color-danger-text)]">
        <AlertCircle className="size-5" strokeWidth={2} aria-hidden />
        Needs Attention
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="tv-glass-card rounded-2xl border border-[var(--color-danger)]/20 px-4 py-3"
          >
            <p className="tv-body font-medium">{item.jobName}</p>
            <p className="tv-body mt-1 text-[14px] text-[var(--color-danger-text)]">
              {item.message}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

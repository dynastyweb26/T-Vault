import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { AttentionItem } from "@/types/jobs";

interface NeedsAttentionProps {
  items: AttentionItem[];
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[20px] font-medium text-[var(--color-danger)]">
        <AlertCircle className="size-5" strokeWidth={2} aria-hidden />
        Needs Attention
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-[var(--radius-card)] border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-4 py-3"
          >
            <p className="text-[16px] font-medium text-[var(--color-text-primary)]">
              {item.jobName}
            </p>
            <p className="mt-1 text-[14px] text-[var(--color-danger-text)]">
              {item.message}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

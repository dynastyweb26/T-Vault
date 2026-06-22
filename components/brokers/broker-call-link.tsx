import type { MouseEvent } from "react";
import { Phone } from "lucide-react";
import { buildTelHref, formatUsPhoneDisplay } from "@/lib/brokers/phone";
import { cn } from "@/lib/utils";

interface BrokerCallLinkProps {
  phone: string;
  className?: string;
  compact?: boolean;
  onActivate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function BrokerCallLink({
  phone,
  className,
  compact = false,
  onActivate,
}: BrokerCallLinkProps) {
  return (
    <a
      href={buildTelHref(phone)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onActivate}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 text-[14px] text-[var(--color-accent)] underline-offset-2 hover:underline",
        className
      )}
    >
      <Phone className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      {compact ? "Call broker" : `Call broker · ${formatUsPhoneDisplay(phone)}`}
    </a>
  );
}

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-white/5 bg-[#050505] px-3 py-1 text-base text-[var(--color-text-primary)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-danger)] aria-invalid:ring-2 aria-invalid:ring-[var(--color-danger)]/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }

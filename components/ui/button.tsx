import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "tv-brushed-gold-btn min-h-11 font-bold text-[var(--color-on-accent)]",
        outline:
          "border-[var(--color-shell-border)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
        secondary:
          "border-[var(--color-shell-border)] bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]",
        destructive:
          "border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] hover:opacity-90",
        link: "text-[var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-1.5 px-3",
        xs: "h-11 min-h-11 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1 rounded-lg px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-14 gap-1.5 px-4 text-base",
        icon: "size-11",
        "icon-xs": "size-11 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-11 rounded-lg",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

import type { FloatingOptions } from "react-joyride";
import { getTourEdgePadding } from "@/lib/tour/safe-area";

/**
 * Safe-area padding for Floating UI shift/flip only.
 * Tooltip position stays anchored to the target rect — no independent Y clamp.
 */
export function buildTourFloatingOptions(): Partial<FloatingOptions> {
  const edge = getTourEdgePadding();

  return {
    shiftOptions: { padding: edge },
    flipOptions: {
      padding: {
        top: edge.top + 10,
        bottom: edge.bottom + 10,
        left: 20,
        right: 20,
      },
    },
  };
}

/** Steps 7–15: bottom-only placement — flip disabled so Floating UI cannot flip to top. */
export function buildTourForceBottomFloatingOptions(): Partial<FloatingOptions> {
  const edge = getTourEdgePadding();

  return {
    flipOptions: false,
    shiftOptions: { padding: edge },
  };
}

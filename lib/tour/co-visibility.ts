import { getTourEdgePadding } from "@/lib/tour/safe-area";

export interface ViewportBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** Safe viewport inset — matches Floating UI shift/flip padding. */
export function getTourVisibleViewportBounds(): ViewportBounds {
  const edge = getTourEdgePadding();
  return {
    top: edge.top,
    left: edge.left,
    right: window.innerWidth - edge.right,
    bottom: window.innerHeight - edge.bottom,
  };
}

function rectIntersectsBounds(rect: DOMRect, bounds: ViewportBounds): boolean {
  return (
    rect.bottom > bounds.top &&
    rect.top < bounds.bottom &&
    rect.right > bounds.left &&
    rect.left < bounds.right
  );
}

export interface CoVisibilityResult {
  ok: boolean;
  targetVisible: boolean;
  tooltipVisible: boolean;
  targetRect: DOMRect | null;
  tooltipRect: DOMRect | null;
  bounds: ViewportBounds;
}

export function checkTourStepCoVisibility(
  targetSelector: string
): CoVisibilityResult {
  const bounds = getTourVisibleViewportBounds();
  const target = document.querySelector(targetSelector);
  const floater = document.querySelector(
    ".react-joyride__floater:not([id$='-beacon'])"
  );

  const targetRect = target?.getBoundingClientRect() ?? null;
  const tooltipRect = floater?.getBoundingClientRect() ?? null;

  const targetVisible = targetRect
    ? rectIntersectsBounds(targetRect, bounds)
    : false;
  const tooltipVisible = tooltipRect
    ? rectIntersectsBounds(tooltipRect, bounds)
    : false;

  return {
    ok: targetVisible && tooltipVisible,
    targetVisible,
    tooltipVisible,
    targetRect,
    tooltipRect,
    bounds,
  };
}

/** Dev-only: warn when tooltip and target are not both in the safe viewport. */
export function warnIfTourStepNotCoVisible(
  stepIndex: number,
  targetSelector: string,
  targetId?: string
): void {
  if (process.env.NODE_ENV === "production") return;

  const result = checkTourStepCoVisibility(targetSelector);
  if (result.ok) return;

  console.warn(
    "[tour] Step co-visibility check failed — tooltip and target must both appear in the safe viewport together.",
    {
      stepIndex,
      displayStep: stepIndex + 1,
      targetId,
      targetSelector,
      targetVisible: result.targetVisible,
      tooltipVisible: result.tooltipVisible,
      bounds: result.bounds,
      targetRect: result.targetRect
        ? {
            top: Math.round(result.targetRect.top),
            bottom: Math.round(result.targetRect.bottom),
            left: Math.round(result.targetRect.left),
            right: Math.round(result.targetRect.right),
          }
        : null,
      tooltipRect: result.tooltipRect
        ? {
            top: Math.round(result.tooltipRect.top),
            bottom: Math.round(result.tooltipRect.bottom),
            left: Math.round(result.tooltipRect.left),
            right: Math.round(result.tooltipRect.right),
          }
        : null,
    }
  );
}

import { getTourEdgePadding } from "@/lib/tour/safe-area";
import { tourSelector, type TourTargetId } from "@/lib/tour/constants";

/** If Joyride never reaches a visible tooltip, show fallback after this delay. */
export const TOUR_DEADLOCK_TIMEOUT_MS = 2000;

export function isJoyrideTooltipVisible(stepIndex: number): boolean {
  const floater = document.querySelector(`#react-joyride-step-${stepIndex}`);
  if (!floater) return false;
  const opacity = Number.parseFloat(getComputedStyle(floater).opacity);
  return Number.isFinite(opacity) && opacity > 0.01;
}

export interface TourFallbackPosition {
  top: number;
  left: number;
  width: number;
}

const FALLBACK_TOOLTIP_ESTIMATED_HEIGHT_PX = 280;

/** Fixed-position fallback when Joyride floater stays opacity:0. */
export function computeTourFallbackPosition(
  targetId: TourTargetId
): TourFallbackPosition {
  const edge = getTourEdgePadding();
  const width = Math.min(window.innerWidth - 40, 352);
  const left = Math.max(edge.left, (window.innerWidth - width) / 2);
  const maxBottom = window.innerHeight - edge.bottom;
  const target = document.querySelector(tourSelector(targetId));

  if (target) {
    const rect = target.getBoundingClientRect();
    let top = rect.top - FALLBACK_TOOLTIP_ESTIMATED_HEIGHT_PX - 12;

    if (top < edge.top) {
      top = rect.bottom + 12;
    }

    top = Math.min(top, maxBottom - FALLBACK_TOOLTIP_ESTIMATED_HEIGHT_PX);
    top = Math.max(edge.top, top);

    return { top, left, width };
  }

  return {
    top: Math.max(edge.top, window.innerHeight * 0.3),
    left,
    width,
  };
}

export function logTourDeadlockError(
  stepIndex: number,
  targetId: TourTargetId
): void {
  const selector = tourSelector(targetId);
  console.error(
    `[tour] Tooltip deadlock: step index ${stepIndex} (display Step ${stepIndex + 1}), target "${targetId}" (${selector}) — Joyride did not reach a visible tooltip within ${TOUR_DEADLOCK_TIMEOUT_MS}ms. Showing fixed-position fallback.`
  );
}

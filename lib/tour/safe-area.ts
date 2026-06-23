const BASE_EDGE_PADDING_PX = 10;
/** Matches TourFab / bottom-nav clearance: bottom-[calc(5.75rem+env(safe-area-inset-bottom))] */
const BOTTOM_NAV_CLEARANCE_REM = 5.75;

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

let safeAreaProbe: HTMLDivElement | null = null;

export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  if (!safeAreaProbe) {
    safeAreaProbe = document.createElement("div");
    safeAreaProbe.setAttribute("aria-hidden", "true");
    safeAreaProbe.style.cssText =
      "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
    document.body.appendChild(safeAreaProbe);
  }

  const style = getComputedStyle(safeAreaProbe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

function bottomNavClearancePx(): number {
  if (typeof document === "undefined") {
    return BOTTOM_NAV_CLEARANCE_REM * 16;
  }
  const rem =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return BOTTOM_NAV_CLEARANCE_REM * rem;
}

/** Edge padding for Floating UI shift/flip — mirrors TourFab bottom safe-area handling. */
export function getTourEdgePadding(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const insets = readSafeAreaInsets();
  return {
    top: Math.max(BASE_EDGE_PADDING_PX, insets.top + BASE_EDGE_PADDING_PX),
    bottom: Math.max(
      BASE_EDGE_PADDING_PX,
      insets.bottom + bottomNavClearancePx() + BASE_EDGE_PADDING_PX
    ),
    left: BASE_EDGE_PADDING_PX,
    right: BASE_EDGE_PADDING_PX,
  };
}

export function getTourMinTopPx(): number {
  return readSafeAreaInsets().top + BASE_EDGE_PADDING_PX;
}

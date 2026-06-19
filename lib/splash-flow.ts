export const SPLASH_NAV_SESSION_KEY = "tvault_splash_nav";

const SPLASH_MIN_MS = 3500;
const SPLASH_MIN_REDUCED_MS = 1000;

let animationStartedAt: number | null = null;

export function getSplashMinDurationMs(): number {
  if (typeof window === "undefined") return SPLASH_MIN_MS;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return SPLASH_MIN_REDUCED_MS;
  }
  return SPLASH_MIN_MS;
}

export function markSplashAnimationStart(): number {
  animationStartedAt = Date.now();
  return animationStartedAt;
}

export function getSplashAnimationStartedAt(): number {
  return animationStartedAt ?? Date.now();
}

export function logSplashAnimationMount(): void {
  if (typeof window === "undefined") return;

  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const sinceNavStart = navigation
    ? Math.round(performance.now() - navigation.startTime)
    : null;
  const sinceResponseEnd =
    navigation?.responseEnd != null
      ? Math.round(performance.now() - navigation.responseEnd)
      : null;

  console.info("[splash] truck animation mounted", {
    sinceNavigationStartMs: sinceNavStart,
    sinceResponseEndMs: sinceResponseEnd,
  });
}

export async function waitForSplashMinimum(startedAt: number): Promise<void> {
  const remaining = getSplashMinDurationMs() - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export function markSplashNavigation(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SPLASH_NAV_SESSION_KEY, "1");
}

export function hasPendingSplashNavigation(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SPLASH_NAV_SESSION_KEY) === "1";
}

export function clearSplashNavigation(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SPLASH_NAV_SESSION_KEY);
}

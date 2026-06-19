export const SPLASH_NAV_SESSION_KEY = "tvault_splash_nav";

const SPLASH_MIN_MS = 3500;
const SPLASH_MIN_REDUCED_MS = 1000;

export function getSplashMinDurationMs(): number {
  if (typeof window === "undefined") return SPLASH_MIN_MS;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return SPLASH_MIN_REDUCED_MS;
  }
  return SPLASH_MIN_MS;
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

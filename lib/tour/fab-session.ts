export const TOUR_FAB_COOLDOWN_MS = 400;

const TOUR_FAB_SUPPRESS_PREFIX = "tv-tour-fab-suppressed:";

export function tourFabSuppressStorageKey(userId: string): string {
  return `${TOUR_FAB_SUPPRESS_PREFIX}${userId}`;
}

export function isTourFabSuppressedForSession(userId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(tourFabSuppressStorageKey(userId)) === "1";
}

export function suppressTourFabForSession(userId: string): void {
  sessionStorage.setItem(tourFabSuppressStorageKey(userId), "1");
}

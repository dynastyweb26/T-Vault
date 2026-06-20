const CHECKLIST_CELEBRATION_PREFIX = "tv-checklist-celebrated-";

export function hasChecklistCelebrationPlayed(jobId: string): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(`${CHECKLIST_CELEBRATION_PREFIX}${jobId}`) === "1";
}

export function markChecklistCelebrationPlayed(jobId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${CHECKLIST_CELEBRATION_PREFIX}${jobId}`, "1");
}

export const DETENTION_FREE_MINUTES = 120;
export const DEFAULT_DETENTION_RATE = 50;

export function formatTimerDisplay(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} minute${mins === 1 ? "" : "s"}`;
  if (mins === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${mins} minute${mins === 1 ? "" : "s"}`;
}

export function calculateDetentionOwed(
  totalMinutes: number,
  hourlyRate = DEFAULT_DETENTION_RATE
): number {
  const billableMinutes = Math.max(0, totalMinutes - DETENTION_FREE_MINUTES);
  return Math.round((billableMinutes * hourlyRate) / 60);
}

export function isDetentionBillable(totalMinutes: number): boolean {
  return totalMinutes >= DETENTION_FREE_MINUTES;
}

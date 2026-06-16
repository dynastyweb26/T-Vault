type HapticPattern = "light" | "medium" | "strong";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  strong: 50,
};

export function triggerHaptic(pattern: HapticPattern = "medium"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(PATTERNS[pattern]);
}

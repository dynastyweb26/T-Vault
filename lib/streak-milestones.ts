export const STREAK_MILESTONES = [3, 5, 10, 15, 20, 25, 30] as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export function isStreakMilestone(days: number): days is StreakMilestone {
  return (STREAK_MILESTONES as readonly number[]).includes(days);
}

export function getStreakMilestoneCrossed(
  previousStreak: number,
  nextStreak: number
): StreakMilestone | null {
  if (previousStreak === nextStreak) return null;
  return isStreakMilestone(nextStreak) ? nextStreak : null;
}

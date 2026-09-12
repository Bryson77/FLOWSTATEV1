export interface StreakInput {
  lastStudyDate: string | null; // ISO date string (YYYY-MM-DD)
  currentStreakDays: number;
  freezesAvailable: number;
}

export interface StreakResult {
  streakDays: number;
  freezesAvailable: number;
  freezeUsed: boolean;
  streakBroken: boolean;
}

/**
 * Calculates streak state based on last study date.
 * Rules:
 * - Studying today maintains/increments streak.
 * - Missing yesterday uses a freeze if available.
 * - Missing 2+ days breaks the streak.
 * - 1 freeze earned every 7 consecutive days.
 */
export function calculateStreak(input: StreakInput, todayISO?: string): StreakResult {
  const today = todayISO ?? new Date().toISOString().split('T')[0];
  const { lastStudyDate, currentStreakDays, freezesAvailable } = input;

  if (!lastStudyDate) {
    return { streakDays: 0, freezesAvailable, freezeUsed: false, streakBroken: false };
  }

  const lastDate = new Date(lastStudyDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Studied today already
    return { streakDays: currentStreakDays, freezesAvailable, freezeUsed: false, streakBroken: false };
  }

  if (diffDays === 1) {
    // Studied yesterday, streak continues
    const newStreak = currentStreakDays + 1;
    const newFreezes = newStreak > 0 && newStreak % 7 === 0
      ? freezesAvailable + 1
      : freezesAvailable;
    return { streakDays: newStreak, freezesAvailable: newFreezes, freezeUsed: false, streakBroken: false };
  }

  if (diffDays === 2 && freezesAvailable > 0) {
    // Missed one day, use freeze
    return {
      streakDays: currentStreakDays + 1,
      freezesAvailable: freezesAvailable - 1,
      freezeUsed: true,
      streakBroken: false,
    };
  }

  // Streak broken
  return { streakDays: 0, freezesAvailable, freezeUsed: false, streakBroken: true };
}

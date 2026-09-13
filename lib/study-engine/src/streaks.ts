export interface StreakInput {
  lastStudyDate: string | null; // ISO date string (YYYY-MM-DD)
  currentStreakDays: number;
  freezesAvailable: number;
  timezone?: string; // IANA timezone, e.g. 'Africa/Johannesburg'
}

export interface StreakResult {
  streakDays: number;
  freezesAvailable: number;
  freezeUsed: boolean;
  streakBroken: boolean;
}

/**
 * Returns ISO date YYYY-MM-DD for a specific date in the given IANA timezone.
 * Defaults to user's system timezone or 'Africa/Johannesburg'.
 */
export function getLocalISODate(date: Date = new Date(), timezone?: string): string {
  try {
    const tz =
      timezone ||
      (typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'Africa/Johannesburg');
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Calculates streak state based on last study date and user local timezone.
 * Rules:
 * - Studying today maintains current streak.
 * - Studying next consecutive day increments streak.
 * - Missing 1 day consumes a freeze if available; streak continues.
 * - Missing 2+ days (or missing 1 day without freeze) resets streak to 1 today.
 * - +1 freeze earned every 7 consecutive days (capped at 3).
 */
export function calculateStreak(input: StreakInput, todayISO?: string): StreakResult {
  const today = todayISO ?? getLocalISODate(new Date(), input.timezone);
  const { lastStudyDate, currentStreakDays, freezesAvailable } = input;

  if (!lastStudyDate) {
    // First study session starts a 1-day streak
    return { streakDays: 1, freezesAvailable, freezeUsed: false, streakBroken: false };
  }

  // Parse YYYY-MM-DD components safely to avoid DST 23h/25h hour-shift skew
  const [lastY, lastM, lastD] = lastStudyDate.split('-').map(Number);
  const [todayY, todayM, todayD] = today.split('-').map(Number);
  const lastUtcMs = Date.UTC(lastY, lastM - 1, lastD);
  const todayUtcMs = Date.UTC(todayY, todayM - 1, todayD);
  const diffDays = Math.round((todayUtcMs - lastUtcMs) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Studied today already
    return { streakDays: currentStreakDays, freezesAvailable, freezeUsed: false, streakBroken: false };
  }

  if (diffDays === 1) {
    // Studied yesterday, streak increments
    const newStreak = currentStreakDays + 1;
    const newFreezes =
      newStreak > 0 && newStreak % 7 === 0 && freezesAvailable < 3
        ? freezesAvailable + 1
        : freezesAvailable;
    return { streakDays: newStreak, freezesAvailable: newFreezes, freezeUsed: false, streakBroken: false };
  }

  if (diffDays === 2 && freezesAvailable > 0) {
    // Missed exactly 1 day, freeze covers it; today's study resumes streak
    const newStreak = currentStreakDays + 1;
    const remainingFreezes = freezesAvailable - 1;
    const finalFreezes =
      newStreak > 0 && newStreak % 7 === 0 && remainingFreezes < 3
        ? remainingFreezes + 1
        : remainingFreezes;
    return {
      streakDays: newStreak,
      freezesAvailable: finalFreezes,
      freezeUsed: true,
      streakBroken: false,
    };
  }

  // Streak broken (missed 2+ days or no freeze); session today restarts streak at 1
  return { streakDays: 1, freezesAvailable, freezeUsed: false, streakBroken: true };
}

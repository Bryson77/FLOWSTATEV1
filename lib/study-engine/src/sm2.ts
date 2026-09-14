import { getLocalISODate } from "./streaks.js";

export type ReviewRating = "retry" | "again" | "hard" | "good" | "easy";

export interface SM2Input {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  quality: number; // 0 to 5
  overdueDays?: number;
}

export interface SM2Output {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: Date;
  inSessionRequeue: boolean;
}

export interface NextReviewInput {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  rating: ReviewRating;
  timezone?: string;
  overdueDays?: number;
}

export interface NextReviewOutput {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string; // YYYY-MM-DD
  inSessionRequeue: boolean;
}

export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL = 180; // 1 semester ceiling

/**
 * Quality ratings:
 * 0 = Retry / Again (complete blackout / failed recall)
 * 2 = Hard (correct after strenuous recall)
 * 4 = Good (correct with hesitation)
 * 5 = Easy (instant perfect recall)
 */
export const QUALITY_MAP: Record<ReviewRating, number> = {
  retry: 0,
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

/**
 * Canonical Saktus SM-2 spaced repetition algorithm.
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const quality = Math.max(0, Math.min(5, Math.round(input.quality)));
  const overdueDays = Math.max(0, input.overdueDays ?? 0);
  let { repetitionNumber, intervalDays, easeFactor } = input;

  // Clamped ease factor on entry
  easeFactor = Math.min(MAX_EASE, Math.max(MIN_EASE, easeFactor));

  // If failed (Retry / Again: quality 0 or 1)
  if (quality < 2) {
    const updatedEase = Math.max(MIN_EASE, easeFactor - 0.2);
    const dueDate = new Date();
    // Failed card remains due today/now for session requeue
    return {
      repetitionNumber: 0,
      intervalDays: 1,
      easeFactor: Number(updatedEase.toFixed(2)),
      dueDate,
      inSessionRequeue: true,
    };
  }

  // Quality >= 3 (Successful recall)
  let nextInterval = 1;

  if (quality === 2) {
    // Hard: ease penalty, gentle interval multiplier without overdue bonus
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    nextInterval =
      repetitionNumber === 0 ? 1 : Math.max(1, Math.floor(intervalDays * 1.2));
  } else if (quality === 4) {
    // Good: Saktus overdue policy applied
    const effectiveInterval = intervalDays + Math.floor(overdueDays / 2);
    if (repetitionNumber === 0) {
      nextInterval = 1;
    } else if (repetitionNumber === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(effectiveInterval * easeFactor);
    }
  } else if (quality === 5) {
    // Easy: ease bonus + 1.3x multiplier + overdue policy
    easeFactor = Math.min(MAX_EASE, easeFactor + 0.15);
    const effectiveInterval = intervalDays + Math.floor(overdueDays / 2);
    if (repetitionNumber === 0) {
      nextInterval = 4;
    } else if (repetitionNumber === 1) {
      nextInterval = 10;
    } else {
      nextInterval = Math.round(effectiveInterval * easeFactor * 1.3);
    }
  }

  repetitionNumber += 1;
  intervalDays = Math.min(MAX_INTERVAL, Math.max(1, nextInterval));
  easeFactor = Number(
    Math.min(MAX_EASE, Math.max(MIN_EASE, easeFactor)).toFixed(2),
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return {
    repetitionNumber,
    intervalDays,
    easeFactor,
    dueDate,
    inSessionRequeue: false,
  };
}

/**
 * High-level SM-2 wrapper accepting UI rating strings ('retry', 'again', 'hard', 'good', 'easy')
 */
export function calculateNextReview(input: NextReviewInput): NextReviewOutput {
  const quality = QUALITY_MAP[input.rating] ?? 4;

  const result = calculateSM2({
    repetitionNumber: input.repetitionNumber,
    intervalDays: input.intervalDays,
    easeFactor: input.easeFactor,
    quality,
    overdueDays: input.overdueDays,
  });

  return {
    repetitionNumber: result.repetitionNumber,
    intervalDays: result.intervalDays,
    easeFactor: result.easeFactor,
    nextReviewDate: getLocalISODate(result.dueDate, input.timezone),
    inSessionRequeue: result.inSessionRequeue,
  };
}

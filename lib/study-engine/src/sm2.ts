export interface SM2Input {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  quality: number; // 0 to 5
}

export interface SM2Output {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: Date;
}

/**
 * SM-2 spaced repetition algorithm.
 * Quality ratings: 0 = complete blackout, 5 = perfect recall.
 * Mapped from UI: Again=0, Hard=2, Good=3, Easy=5.
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const quality = Math.max(0, Math.min(5, Math.round(input.quality)));
  let { repetitionNumber, intervalDays, easeFactor } = input;

  if (quality >= 3) {
    // Correct response
    if (repetitionNumber === 0) {
      intervalDays = 1;
    } else if (repetitionNumber === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitionNumber += 1;
  } else {
    // Incorrect response — reset
    repetitionNumber = 0;
    intervalDays = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return { repetitionNumber, intervalDays, easeFactor, dueDate };
}

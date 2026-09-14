import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSM2, calculateNextReview, MIN_EASE, MAX_EASE, MAX_INTERVAL } from '../dist/sm2.js';

test('SM-2: New card rated Retry', () => {
  const result = calculateSM2({
    repetitionNumber: 0,
    intervalDays: 0,
    easeFactor: 2.50,
    quality: 0,
  });

  assert.equal(result.repetitionNumber, 0);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.easeFactor, 2.30);
  assert.equal(result.inSessionRequeue, true);
});

test('SM-2: New card rated Hard', () => {
  const result = calculateSM2({
    repetitionNumber: 0,
    intervalDays: 0,
    easeFactor: 2.50,
    quality: 2,
  });

  assert.equal(result.repetitionNumber, 1);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.easeFactor, 2.35);
  assert.equal(result.inSessionRequeue, false);
});

test('SM-2: New card rated Good', () => {
  const result = calculateSM2({
    repetitionNumber: 0,
    intervalDays: 0,
    easeFactor: 2.50,
    quality: 4,
  });

  assert.equal(result.repetitionNumber, 1);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.easeFactor, 2.50);
  assert.equal(result.inSessionRequeue, false);
});

test('SM-2: New card rated Easy', () => {
  const result = calculateSM2({
    repetitionNumber: 0,
    intervalDays: 0,
    easeFactor: 2.50,
    quality: 5,
  });

  assert.equal(result.repetitionNumber, 1);
  assert.equal(result.intervalDays, 4);
  assert.equal(result.easeFactor, 2.65);
  assert.equal(result.inSessionRequeue, false);
});

test('SM-2: Consecutive Good reviews advance intervals correctly', () => {
  // Rep 1 Good -> Rep 2, int 6
  let res = calculateSM2({
    repetitionNumber: 1,
    intervalDays: 1,
    easeFactor: 2.50,
    quality: 4,
  });
  assert.equal(res.repetitionNumber, 2);
  assert.equal(res.intervalDays, 6);

  // Rep 2 Good -> Rep 3, int 15 (6 * 2.5)
  res = calculateSM2({
    repetitionNumber: 2,
    intervalDays: 6,
    easeFactor: 2.50,
    quality: 4,
  });
  assert.equal(res.repetitionNumber, 3);
  assert.equal(res.intervalDays, 15);
});

test('SM-2: Saktus Overdue Policy gives bonus on Good recall', () => {
  // Card 10 days overdue: effective interval = 6 + 5 = 11. Next = round(11 * 2.5) = 28
  const res = calculateSM2({
    repetitionNumber: 2,
    intervalDays: 6,
    easeFactor: 2.50,
    quality: 4,
    overdueDays: 10,
  });

  assert.equal(res.repetitionNumber, 3);
  assert.equal(res.intervalDays, 28);
});

test('SM-2: Interval is capped at 180 days (one semester ceiling)', () => {
  const res = calculateSM2({
    repetitionNumber: 5,
    intervalDays: 100,
    easeFactor: 2.50,
    quality: 5,
  });

  assert.equal(res.intervalDays, MAX_INTERVAL);
  assert.equal(res.easeFactor, 2.65);
});

test('SM-2: Ease factor is clamped within [1.30, 3.00]', () => {
  // Lower clamp
  let res = calculateSM2({
    repetitionNumber: 0,
    intervalDays: 1,
    easeFactor: 1.35,
    quality: 0,
  });
  assert.equal(res.easeFactor, MIN_EASE);

  // Upper clamp
  res = calculateSM2({
    repetitionNumber: 5,
    intervalDays: 10,
    easeFactor: 2.95,
    quality: 5,
  });
  assert.equal(res.easeFactor, MAX_EASE);
});

test('calculateNextReview wrapper accepts string ratings', () => {
  const res = calculateNextReview({
    repetitionNumber: 0,
    intervalDays: 0,
    easeFactor: 2.50,
    rating: 'retry',
  });

  assert.equal(res.inSessionRequeue, true);
  assert.equal(res.repetitionNumber, 0);
  assert.equal(res.intervalDays, 1);
});

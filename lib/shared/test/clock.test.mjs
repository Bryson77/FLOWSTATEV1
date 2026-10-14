import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRemainingSeconds } from '../src/clock.ts';

test('calculateRemainingSeconds handles completed state', () => {
  const state = {
    durationSeconds: 1500,
    elapsedSecondsAtPause: 500,
    lastResumedAt: new Date().toISOString(),
    status: 'completed',
  };
  assert.equal(calculateRemainingSeconds(state), 0);
});

test('calculateRemainingSeconds handles paused state', () => {
  const state = {
    durationSeconds: 1500,
    elapsedSecondsAtPause: 600,
    lastResumedAt: null,
    status: 'paused',
  };
  assert.equal(calculateRemainingSeconds(state), 900);
});

test('calculateRemainingSeconds handles active state with elapsed time', () => {
  const now = Date.now();
  // Resumed 100 seconds ago
  const resumedAt = new Date(now - 100 * 1000).toISOString();
  const state = {
    durationSeconds: 1500,
    elapsedSecondsAtPause: 200,
    lastResumedAt: resumedAt,
    status: 'active',
  };
  const rem = calculateRemainingSeconds(state);
  // Total elapsed should be ~300 seconds, so remaining ~1200
  assert.ok(rem >= 1198 && rem <= 1200, `Expected remaining ~1200, got ${rem}`);
});

test('calculateRemainingSeconds clamps to zero when elapsed exceeds duration', () => {
  const now = Date.now();
  // Resumed 2000 seconds ago for a 1500 second duration
  const resumedAt = new Date(now - 2000 * 1000).toISOString();
  const state = {
    durationSeconds: 1500,
    elapsedSecondsAtPause: 0,
    lastResumedAt: resumedAt,
    status: 'active',
  };
  assert.equal(calculateRemainingSeconds(state), 0);
});

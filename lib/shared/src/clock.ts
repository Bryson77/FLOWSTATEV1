/**
 * Saktus Social Study Room & Delta-Resilient Clock System
 * Implements Section 4.2 & 4.3 of the Saktus Social Study, Copy & Design System V2
 */

export interface StudyRoomClockState {
  durationSeconds: number; // Total planned duration (e.g. 1500 for 25m)
  elapsedSecondsAtPause: number; // Cumulative seconds elapsed before current run
  lastResumedAt: string | null; // ISO timestamp when current run started
  status: 'active' | 'paused' | 'completed';
}

/**
 * Computes remaining seconds dynamically against local clock.
 * Resilient against pauses and network disconnections.
 */
export function calculateRemainingSeconds(state: StudyRoomClockState): number {
  if (state.status === 'completed') return 0;

  if (state.status === 'paused' || !state.lastResumedAt) {
    const remaining = state.durationSeconds - state.elapsedSecondsAtPause;
    return Math.max(0, remaining);
  }

  // Active state: calculate elapsed delta against local clock
  const nowMs = Date.now();
  const resumedMs = new Date(state.lastResumedAt).getTime();
  const currentRunSeconds = Math.max(0, Math.floor((nowMs - resumedMs) / 1000));
  const totalElapsed = state.elapsedSecondsAtPause + currentRunSeconds;
  const remaining = state.durationSeconds - totalElapsed;

  return Math.max(0, remaining);
}

export type CheerIconType = 'Zap' | 'Flame' | 'Coffee' | 'ThumbsUp';

export interface RoomCheerPayload {
  icon: CheerIconType;
  sender_name: string;
  sender_id: string;
  timestamp: string;
}

export interface RoomStartPayload {
  last_resumed_at: string;
}

export interface RoomPausePayload {
  elapsed_seconds: number;
}

export interface RoomPresenceState {
  user_id: string;
  name: string;
  avatar_url?: string;
  is_studying: boolean;
  subject?: string;
}

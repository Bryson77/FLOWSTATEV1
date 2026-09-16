'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

export type TimerMode = 'pomodoro' | 'short_break' | 'long_break' | 'stopwatch';

export interface TimerAttachment {
  type: 'course' | 'task' | 'assessment' | 'general';
  id?: string | null;
  title: string;
}

interface TimerContextType {
  mode: TimerMode;
  durationSeconds: number;
  secondsRemaining: number;
  isRunning: boolean;
  targetEndTime: number | null;
  attachment: TimerAttachment;
  intention: string;
  activeSound: 'none' | 'binaural' | 'brown' | 'rain';
  soundVolume: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  selectMode: (mode: TimerMode) => void;
  setAttachment: (attachment: TimerAttachment) => void;
  setIntention: (text: string) => void;
  setActiveSound: (sound: 'none' | 'binaural' | 'brown' | 'rain') => void;
  setSoundVolume: (vol: number) => void;
  formatTime: (seconds: number) => string;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY = 'saktus_persistent_timer_v1';

const DEFAULT_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  stopwatch: 0,
};

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<TimerMode>('pomodoro');
  const [durationSeconds, setDurationSeconds] = useState(25 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [stopwatchStartTime, setStopwatchStartTime] = useState<number | null>(null);
  const [attachment, setAttachmentState] = useState<TimerAttachment>({
    type: 'general',
    id: null,
    title: 'General Focus',
  });
  const [intention, setIntentionState] = useState('');
  const [activeSound, setActiveSound] = useState<'none' | 'binaural' | 'brown' | 'rain'>('none');
  const [soundVolume, setSoundVolume] = useState(0.4);

  const supabase = createClient();
  const { toast } = useToast();

  // Load persisted timer state on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);

      const savedMode: TimerMode = parsed.mode || 'pomodoro';
      const savedDuration: number = parsed.durationSeconds || DEFAULT_DURATIONS[savedMode];
      const savedTarget: number | null = parsed.targetEndTime || null;
      const savedStopwatchStart: number | null = parsed.stopwatchStartTime || null;
      const savedRunning: boolean = Boolean(parsed.isRunning);

      setModeState(savedMode);
      setDurationSeconds(savedDuration);
      if (parsed.attachment) setAttachmentState(parsed.attachment);
      if (parsed.intention) setIntentionState(parsed.intention);

      if (savedRunning) {
        if (savedMode === 'stopwatch' && savedStopwatchStart) {
          const elapsed = Math.floor((Date.now() - savedStopwatchStart) / 1000);
          setStopwatchStartTime(savedStopwatchStart);
          setSecondsRemaining(Math.max(0, elapsed));
          setIsRunning(true);
        } else if (savedTarget) {
          const diff = Math.ceil((savedTarget - Date.now()) / 1000);
          if (diff > 0) {
            setTargetEndTime(savedTarget);
            setSecondsRemaining(diff);
            setIsRunning(true);
          } else {
            // Finished while offline/away
            setTargetEndTime(null);
            setSecondsRemaining(0);
            setIsRunning(false);
          }
        }
      } else {
        setSecondsRemaining(
          parsed.secondsRemaining !== undefined ? parsed.secondsRemaining : savedDuration
        );
      }
    } catch (e) {
      console.error('Error loading persisted timer:', e);
    }
  }, []);

  // Save persistent state whenever running or config changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode,
          durationSeconds,
          secondsRemaining,
          isRunning,
          targetEndTime,
          stopwatchStartTime,
          attachment,
          intention,
        })
      );
    } catch {}
  }, [
    mode,
    durationSeconds,
    secondsRemaining,
    isRunning,
    targetEndTime,
    stopwatchStartTime,
    attachment,
    intention,
  ]);

  // Session completion
  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    setTargetEndTime(null);
    setStopwatchStartTime(null);

    const loggedSeconds =
      mode === 'stopwatch' ? secondsRemaining : durationSeconds - secondsRemaining;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && loggedSeconds >= 60) {
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          course_id: attachment.type === 'course' ? attachment.id : null,
          task_id: attachment.type === 'task' ? attachment.id : null,
          assessment_id: attachment.type === 'assessment' ? attachment.id : null,
          duration_seconds: loggedSeconds,
          mode: mode === 'stopwatch' ? 'stopwatch' : 'pomodoro',
          completed_at: new Date().toISOString(),
          notes: intention.trim() || null,
        });

        if (loggedSeconds >= 25 * 60) {
          await (supabase.rpc as any)('record_study_activity', {
            p_user_id: user.id,
            p_activity_type: 'session',
          });
        }
      }

      toast(
        `Focus session completed! ${Math.floor(loggedSeconds / 60)} minutes logged.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to log completed timer session:', err);
    } finally {
      const resetSec = DEFAULT_DURATIONS[mode as TimerMode];
      setSecondsRemaining(resetSec);
      setDurationSeconds(resetSec);
    }
  }, [
    mode,
    secondsRemaining,
    durationSeconds,
    attachment,
    intention,
    supabase,
    toast,
  ]);

  // Main high-precision tick loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          if (stopwatchStartTime) {
            const elapsed = Math.floor((Date.now() - stopwatchStartTime) / 1000);
            setSecondsRemaining(elapsed);
          } else {
            setSecondsRemaining((prev: number) => prev + 1);
          }
        } else {
          if (targetEndTime) {
            const diff = Math.ceil((targetEndTime - Date.now()) / 1000);
            if (diff <= 0) {
              setSecondsRemaining(0);
              handleSessionComplete();
            } else {
              setSecondsRemaining(diff);
            }
          }
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, targetEndTime, stopwatchStartTime, handleSessionComplete]);

  const startTimer = () => {
    if (mode === 'stopwatch') {
      const startTime = Date.now() - secondsRemaining * 1000;
      setStopwatchStartTime(startTime);
      setIsRunning(true);
    } else {
      const target = Date.now() + secondsRemaining * 1000;
      setTargetEndTime(target);
      setIsRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    setTargetEndTime(null);
    setStopwatchStartTime(null);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTargetEndTime(null);
    setStopwatchStartTime(null);
    const sec = DEFAULT_DURATIONS[mode as TimerMode];
    setSecondsRemaining(sec);
    setDurationSeconds(sec);
  };

  const selectMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setTargetEndTime(null);
    setStopwatchStartTime(null);
    setModeState(newMode);
    const sec = DEFAULT_DURATIONS[newMode];
    setDurationSeconds(sec);
    setSecondsRemaining(sec);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TimerContext.Provider
      value={{
        mode,
        durationSeconds,
        secondsRemaining,
        isRunning,
        targetEndTime,
        attachment,
        intention,
        activeSound,
        soundVolume,
        startTimer,
        pauseTimer,
        resetTimer,
        selectMode,
        setAttachment: setAttachmentState,
        setIntention: setIntentionState,
        setActiveSound,
        setSoundVolume,
        formatTime,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function usePersistentTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('usePersistentTimer must be used within a TimerProvider');
  }
  return context;
}

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import { getLocalISODate } from '@saktus/study-engine';

export type AttachmentType = 'course' | 'task' | 'assessment' | 'general';

export interface AttachmentItem {
  id: string;
  title: string;
  subtitle?: string;
  type: AttachmentType;
}

interface TimerContextType {
  selectedDuration: number;
  timeLeft: number;
  isRunning: boolean;
  selectedItem: AttachmentItem | null;
  toggleTimer: () => void;
  resetTimer: () => void;
  selectDuration: (sec: number) => void;
  setSelectedItem: (item: AttachmentItem | null) => void;
  timeStr: string;
  mins: number;
  secs: number;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<AttachmentItem | null>(null);

  // Handle session complete
  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    setTargetEndTime(null);

    if (!user) {
      setTimeLeft(selectedDuration);
      return;
    }

    try {
      const sessionSeconds = selectedDuration;
      const courseId = selectedItem?.type === 'course' ? selectedItem.id : null;
      const taskId = selectedItem?.type === 'task' ? selectedItem.id : null;
      const assessmentId = selectedItem?.type === 'assessment' ? selectedItem.id : null;

      // Log session
      await supabase.from('study_sessions').insert({
        user_id: user.id,
        course_id: courseId,
        task_id: taskId,
        assessment_id: assessmentId,
        duration_seconds: sessionSeconds,
        mode: 'pomodoro',
        completed_at: new Date().toISOString(),
      });

      // Update streaks via authoritative RPC
      await (supabase.rpc as any)('record_study_activity', {
        p_user_id: user.id,
        p_activity_type: 'session',
      });

      await supabase
        .from('profiles')
        .update({
          is_studying_now: false,
        })
        .eq('id', user.id);

      Alert.alert(
        'Session Completed',
        `Logged ${Math.floor(sessionSeconds / 60)} minutes to ${
          selectedItem?.title || 'General Focus'
        }.`
      );
    } catch (e) {
      console.error('Error logging session:', e);
    } finally {
      setTimeLeft(selectedDuration);
    }
  }, [user, selectedDuration, selectedItem]);

  // Wall-clock timestamp sync loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && targetEndTime) {
      interval = setInterval(() => {
        const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setTimeLeft(0);
          handleSessionComplete();
        } else {
          setTimeLeft(remaining);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, targetEndTime, handleSessionComplete]);

  // App state listener for phone sleep/resume background continuity
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isRunning && targetEndTime) {
        const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setTimeLeft(0);
          handleSessionComplete();
        } else {
          setTimeLeft(remaining);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning, targetEndTime, handleSessionComplete]);

  const toggleTimer = () => {
    if (isRunning) {
      // Pause
      setIsRunning(false);
      setTargetEndTime(null);
    } else {
      // Start
      const target = Date.now() + timeLeft * 1000;
      setTargetEndTime(target);
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTargetEndTime(null);
    setTimeLeft(selectedDuration);
  };

  const selectDuration = (sec: number) => {
    if (isRunning) return;
    setSelectedDuration(sec);
    setTimeLeft(sec);
    setTargetEndTime(null);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <TimerContext.Provider
      value={{
        selectedDuration,
        timeLeft,
        isRunning,
        selectedItem,
        toggleTimer,
        resetTimer,
        selectDuration,
        setSelectedItem,
        timeStr,
        mins,
        secs,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useMobileTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useMobileTimer must be used within a TimerProvider');
  }
  return context;
}

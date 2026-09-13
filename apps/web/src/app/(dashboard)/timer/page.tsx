'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

const MOTIVES = [
  'stay locked in.',
  'one session closer.',
  'finish what you started.',
  'deep work pays off.',
  'pressure makes diamonds.',
  'floor it.'
];

interface CourseItem {
  id: string;
  name: string;
  code: string;
}

export default function TimerPage() {
  const [mode, setMode] = useState<'work' | 'short' | 'long'>('work');
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [initialDuration, setInitialDuration] = useState(45 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [intention, setIntention] = useState('');
  const [motiveIndex, setMotiveIndex] = useState(0);
  const [isLogging, setIsLogging] = useState(false);

  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function loadCourses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (data && data.length > 0) {
        setCourses(data);
        setSelectedCourseId(data[0].id);
      }
    }
    loadCourses();
  }, [supabase]);

  const setTimerMode = (newMode: 'work' | 'short' | 'long') => {
    setIsRunning(false);
    setMode(newMode);
    const duration = newMode === 'work' ? 45 * 60 : newMode === 'short' ? 5 * 60 : 15 * 60;
    setTimeLeft(duration);
    setInitialDuration(duration);
  };

  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('Session finished');
        return;
      }

      const durationSeconds = initialDuration - timeLeft;
      if (durationSeconds < 60) {
        toast('Session too short to record', 'info');
        return;
      }

      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          course_id: selectedCourseId || null,
          duration_seconds: durationSeconds,
          mode: mode === 'work' ? 'pomodoro' : 'stopwatch',
          completed_at: new Date().toISOString(),
          notes: intention.trim() || null,
        });

      if (error) throw error;
      toast('✓ Logged');
      setIntention('');
    } catch {
      toast('Failed to save session. Try again.', 'error');
    } finally {
      setIsLogging(false);
    }
  }, [supabase, initialDuration, timeLeft, selectedCourseId, mode, intention, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleSessionComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, handleSessionComplete]);

  const toggleTimer = () => {
    if (!isRunning) {
      setMotiveIndex(Math.floor(Math.random() * MOTIVES.length));
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimerMode(mode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-200 py-8 text-center">
      {/* Course Tag selector */}
      <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#111111] px-4 py-1.5 backdrop-blur-[40px]">
        <span className="text-xs text-[#A0A0A0]">Course:</span>
        {courses.length > 0 ? (
          <select
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            className="bg-transparent text-xs font-mono font-semibold text-white focus:outline-none cursor-pointer"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id} className="bg-[#1A1A1A] text-white">
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-mono text-zinc-400">General Focus</span>
        )}
      </div>

      {/* Mode Switches */}
      <div className="flex items-center justify-center gap-2">
        {(['work', 'short', 'long'] as const).map(m => (
          <button
            key={m}
            onClick={() => setTimerMode(m)}
            className={`rounded-full px-5 py-1.5 text-xs font-medium transition-all ${
              mode === m
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-[#A0A0A0] hover:text-white bg-[#111111] border border-[#2A2A2A]'
            }`}
          >
            {m === 'work' ? '45m Focus' : m === 'short' ? '5m Break' : '15m Rest'}
          </button>
        ))}
      </div>

      {/* Main Clock Face */}
      <div className="py-6">
        <h1 className="font-mono text-7xl sm:text-9xl font-bold tracking-tighter text-white tabular-nums select-none drop-shadow-2xl">
          {formatTime(timeLeft)}
        </h1>
        <p className="font-serif italic text-lg sm:text-xl text-[#A0A0A0] mt-4 transition-all">
          "{MOTIVES[motiveIndex]}"
        </p>
      </div>

      {/* Intention Input */}
      <div className="max-w-sm mx-auto">
        <input
          type="text"
          placeholder="What are you locking in on?"
          value={intention}
          onChange={e => setIntention(e.target.value)}
          className="w-full text-center rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Timer Controls */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={toggleTimer}
          className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white text-black shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          {isRunning ? <Pause className="h-6 w-6 fill-black" /> : <Play className="h-6 w-6 fill-black ml-1" />}
        </button>
        <button
          onClick={resetTimer}
          className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-[#2A2A2A] bg-[#111111] text-[#A0A0A0] hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Reset"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        {timeLeft < initialDuration && !isRunning && (
          <button
            onClick={handleSessionComplete}
            disabled={isLogging}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Log Early</span>
          </button>
        )}
      </div>
    </div>
  );
}

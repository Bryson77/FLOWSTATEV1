'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Sparkles, CheckCircle2, Volume2, VolumeX } from 'lucide-react';

const MOTIVES = [
  'stay locked in.',
  'one session closer.',
  'finish what you started.',
  'deep work pays off.',
  'pressure makes diamonds.',
  'floor it.'
];

export default function TimerPage() {
  const [mode, setMode] = useState<'work' | 'short' | 'long'>('work');
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('CSC2001F');
  const [intention, setIntention] = useState('');
  const [motiveIndex, setMotiveIndex] = useState(0);

  // Set mode durations (matching FlowState legacy defaults)
  const setTimerMode = (newMode: 'work' | 'short' | 'long') => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'work') setTimeLeft(45 * 60);
    if (newMode === 'short') setTimeLeft(5 * 60);
    if (newMode === 'long') setTimeLeft(15 * 60);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);

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
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 py-8 text-center">
      {/* Course Tag selector */}
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-1.5 backdrop-blur-[40px]">
        <span className="text-xs text-[#A0A0A0]">Course:</span>
        <select
          value={selectedCourse}
          onChange={e => setSelectedCourse(e.target.value)}
          className="bg-transparent text-xs font-mono font-semibold text-white focus:outline-none cursor-pointer"
        >
          <option value="CSC2001F" className="bg-zinc-900 text-white">CSC2001F · Computer Science</option>
          <option value="MTH2000S" className="bg-zinc-900 text-white">MTH2000S · Linear Algebra</option>
          <option value="GENERAL" className="bg-zinc-900 text-white">General Revision</option>
        </select>
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
                : 'text-[#A0A0A0] hover:text-white bg-white/5'
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
          className="w-full text-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Timer Controls */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={toggleTimer}
          className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white text-black shadow-2xl transition-all hover:scale-110 active:scale-95"
        >
          {isRunning ? <Pause className="h-6 w-6 fill-black" /> : <Play className="h-6 w-6 fill-black ml-1" />}
        </button>
        <button
          onClick={resetTimer}
          className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          title="Reset"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Pause, Timer as TimerIcon } from 'lucide-react';
import { usePersistentTimer } from './timer-context';

export function FloatingTimerWidget() {
  const pathname = usePathname();
  const {
    isRunning,
    secondsRemaining,
    mode,
    startTimer,
    pauseTimer,
    formatTime,
    attachment,
  } = usePersistentTimer();

  // Hide widget if user is currently on the timer page
  if (pathname.startsWith('/timer')) {
    return null;
  }

  // Only show if the timer is currently running or paused with time ticked
  if (!isRunning && secondsRemaining === (mode === 'stopwatch' ? 0 : 25 * 60)) {
    return null;
  }

  const modeLabel =
    mode === 'pomodoro'
      ? 'Focus'
      : mode === 'short_break'
      ? 'Break'
      : mode === 'long_break'
      ? 'Long Break'
      : 'Stopwatch';

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2.5 p-2 pr-3 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] shadow-lg">
        {/* Link to Timer Page */}
        <Link
          href="/timer"
          className="flex items-center gap-2 pl-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <TimerIcon className="w-3.5 h-3.5 text-zinc-900 dark:text-white animate-pulse" />
          </div>

          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white tracking-tight tnum">
              {formatTime(secondsRemaining)}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              {modeLabel} · {attachment?.title ? attachment.title.slice(0, 14) : 'General'}
            </span>
          </div>
        </Link>

        {/* Quick Play/Pause */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isRunning) {
              pauseTimer();
            } else {
              startTimer();
            }
          }}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 btn-press transition-all"
          title={isRunning ? 'Pause timer' : 'Resume timer'}
        >
          {isRunning ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}

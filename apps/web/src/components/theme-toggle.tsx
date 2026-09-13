'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon';
  className?: string;
}

export function ThemeToggle({ variant = 'pill', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        aria-label="Toggle visual theme"
        className={`p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all btn-press shadow-sm ${className}`}
      >
        {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-700" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle visual theme"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all btn-press shadow-sm ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono text-[11px]">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-zinc-600" />
          <span className="font-mono text-[11px]">Dark Mode</span>
        </>
      )}
    </button>
  );
}

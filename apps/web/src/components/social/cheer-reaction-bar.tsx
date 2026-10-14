'use client';

import React from 'react';
import { Zap, Flame, Coffee, ThumbsUp } from 'lucide-react';
import type { CheerIconType } from '@saktus/shared';

interface CheerReactionBarProps {
  onCheer: (icon: CheerIconType) => void;
  disabled?: boolean;
}

export const CHEER_CONFIG: Record<
  CheerIconType,
  { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; desc: string }
> = {
  Zap: {
    label: 'Energy',
    icon: Zap,
    colorClass: 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40',
    desc: 'Energy / Lock In',
  },
  Flame: {
    label: 'Streak Fire',
    icon: Flame,
    colorClass: 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40',
    desc: 'Streak on Fire',
  },
  Coffee: {
    label: 'Coffee',
    icon: Coffee,
    colorClass: 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40',
    desc: 'Break Time Soon',
  },
  ThumbsUp: {
    label: 'Solid Work',
    icon: ThumbsUp,
    colorClass: 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
    desc: 'Solid Work',
  },
};

export function CheerReactionBar({ onCheer, disabled = false }: CheerReactionBarProps) {
  const cheerKeys: CheerIconType[] = ['Zap', 'Flame', 'Coffee', 'ThumbsUp'];

  return (
    <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
      {cheerKeys.map((key) => {
        const item = CHEER_CONFIG[key];
        const Icon = item.icon;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onCheer(key)}
            title={item.desc}
            className={`btn-press p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${item.colorClass}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

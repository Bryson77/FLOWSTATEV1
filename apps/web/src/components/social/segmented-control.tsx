'use client';

import React from 'react';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onChange: (id: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200/60 dark:border-zinc-800/60 shadow-inner">
      {options.map((option) => {
        const isActive = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`btn-press relative px-3.5 py-1.5 text-xs rounded-lg transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{option.label}</span>
              {typeof option.count === 'number' && (
                <span
                  className={`text-[10px] font-mono rounded px-1.5 py-0.2 ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                      : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

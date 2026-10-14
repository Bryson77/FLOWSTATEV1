'use client';

import React from 'react';
import { Users, Clock, ArrowRight } from 'lucide-react';

export interface RoomCardProps {
  name: string;
  hostName: string;
  durationMinutes: number;
  activeCount: number;
  onJoin: () => void;
}

export function StudyRoomCard({
  name,
  hostName,
  durationMinutes,
  activeCount,
  onJoin,
}: RoomCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-5 shadow-xs transition-colors duration-150 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sprint
          </div>
          <h3 className="font-semibold text-base text-zinc-900 dark:text-white tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Hosted by {hostName}
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tnum">{durationMinutes}m</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tnum font-medium">{activeCount} studying</span>
        </div>

        <button
          type="button"
          onClick={onJoin}
          className="btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black shadow-xs cursor-pointer"
        >
          <span>Join Sprint</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

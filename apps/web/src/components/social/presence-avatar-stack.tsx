'use client';

import React from 'react';

export interface AvatarItem {
  id: string;
  name: string;
  avatarUrl?: string;
  isStudying: boolean;
  subject?: string;
}

export function PresenceAvatarStack({ members }: { members: AvatarItem[] }) {
  const visible = members.slice(0, 5);
  const remaining = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden">
      {visible.map((m) => (
        <div key={m.id} className="relative group inline-block">
          <div className="h-8 w-8 rounded-full border-2 border-white dark:border-black bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-900 dark:text-white overflow-hidden shadow-xs">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
            ) : (
              m.name.charAt(0).toUpperCase()
            )}
          </div>
          {m.isStudying && (
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"
              title={`Studying: ${m.subject || 'Focus'}`}
            />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="h-8 w-8 rounded-full border-2 border-white dark:border-black bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
          +{remaining}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Users, UserPlus, Zap, Trophy, Coffee, Flame, Shield } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  isStudying: boolean;
  minsLeft: number;
  streak: number;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  hours: number;
  cards: number;
  isUser?: boolean;
}

const INITIAL_FRIENDS: Friend[] = [
  {
    id: '1',
    name: 'Kagiso T.',
    avatar: 'KT',
    subject: 'Data Structures',
    isStudying: true,
    minsLeft: 34,
    streak: 12
  },
  {
    id: '2',
    name: 'Liam D.',
    avatar: 'LD',
    subject: 'Contract Law',
    isStudying: true,
    minsLeft: 15,
    streak: 8
  },
  {
    id: '3',
    name: 'Sarah M.',
    avatar: 'SM',
    subject: 'Calculus III',
    isStudying: false,
    minsLeft: 0,
    streak: 5
  }
];

const LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'Kagiso T.', hours: 18.5, cards: 140 },
  { rank: 2, name: 'You (Lethabo)', hours: 14.0, cards: 95, isUser: true },
  { rank: 3, name: 'Liam D.', hours: 11.2, cards: 72 },
  { rank: 4, name: 'Sarah M.', hours: 8.5, cards: 50 }
];

export default function FriendsPage() {
  const [friends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [cheered, setCheered] = useState<Record<string, string>>({});

  const handleCheer = (id: string, text: string) => {
    setCheered(prev => ({ ...prev, [id]: text }));
    setTimeout(() => {
      setCheered(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Squad & Friends</h1>
          <p className="mt-1 text-[#A0A0A0]">Real-time study presence and weekly leaderboards.</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:scale-105 active:scale-[0.97]"
        >
          <UserPlus className="h-4 w-4" />
          Join Squad
        </button>
      </div>

      {/* Live Now Study Group */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-4">
          Studying Now (Active Friends)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {friends.map(friend => (
            <div
              key={friend.id}
              className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-5 flex items-center justify-between transition-all hover:bg-[rgba(255,255,255,0.05)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center font-semibold text-xs text-white">
                    {friend.avatar}
                  </div>
                  {friend.isStudying && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-black" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{friend.name}</h4>
                  <p className="text-xs text-zinc-400">
                    {friend.isStudying ? (
                      <span className="text-zinc-300">Locked in · {friend.subject} ({friend.minsLeft}m left)</span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>

              {/* 1-Tap Cheer button */}
              <div className="flex items-center gap-2">
                {friend.isStudying && (
                  <button
                    onClick={() => handleCheer(friend.id, 'Sent')}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white hover:bg-white/15 transition-all active:scale-95"
                    title="Send Quick Cheer"
                  >
                    {cheered[friend.id] ? (
                      <span className="text-[10px] font-bold text-white px-1">Sent</span>
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Campus / Squad Leaderboard */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] backdrop-blur-[40px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-lg font-semibold text-white">Weekly Focus Leaderboard</h3>
          </div>
          <span className="text-xs text-[#A0A0A0] font-mono">Resets Sunday 00:00</span>
        </div>

        <div className="divide-y divide-white/5">
          {LEADERBOARD.map(user => (
            <div
              key={user.rank}
              className={`flex items-center justify-between py-3 px-2 rounded-lg ${
                user.isUser ? 'bg-white/5 font-semibold' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[#A0A0A0] w-6">{user.rank}.</span>
                <span className="text-sm text-white">{user.name}</span>
              </div>
              <div className="flex items-center gap-6 text-xs font-mono">
                <span className="text-zinc-300">{user.hours} hrs focused</span>
                <span className="text-zinc-500">{user.cards} cards</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Play, Calendar, GraduationCap, Layers, Flame, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';

export default function TodayPage() {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* Header & Streak Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">Good evening</h1>
          <p className="mt-1 text-[#A0A0A0]">Here is your academic overview for today.</p>
        </div>

        {/* Streak Counter Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 backdrop-blur-[40px] saturate-[150%]">
          <Flame className="h-5 w-5 text-amber-400 fill-amber-400/20" />
          <span className="font-mono text-sm font-semibold text-white">4 Day Streak</span>
          <span className="text-xs text-zinc-500 font-mono">| 1 freeze</span>
        </div>
      </div>

      {/* Dynamic "Next Up" Class Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-[rgba(255,255,255,0.03)] to-transparent p-6 backdrop-blur-[40px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Next Class Up</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-1.5">
              CSC2001F · Computer Science
            </h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#A0A0A0]">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                Tomorrow at 09:00 - 10:30
              </span>
              <span>Science Block LT2</span>
            </div>
          </div>

          <Link
            href="/timetable"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-white/10 active:scale-[0.97]"
          >
            View Schedule
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Cockpit Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Focus Progress */}
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-[40px] saturate-[150%] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">Session Goal</span>
            <Link href="/timer" className="text-zinc-500 hover:text-white transition-colors">
              <Play className="h-4 w-4" />
            </Link>
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-white">2</span>
              <span className="text-sm text-[#A0A0A0] font-mono">/ 4 sessions</span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white rounded-full w-1/2 transition-all" />
            </div>
          </div>
          <Link
            href="/timer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 transition-colors"
          >
            Start Focus Session
          </Link>
        </div>

        {/* Card 2: Flashcards Due */}
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-[40px] saturate-[150%] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">Flashcards Due</span>
            <Layers className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-white">18</span>
              <span className="text-sm text-[#A0A0A0]">cards to review</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Binary Trees & Linear Algebra</p>
          </div>
          <Link
            href="/flashcards"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 transition-colors"
          >
            Review Flashcards
          </Link>
        </div>

        {/* Card 3: Next Assessment */}
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-[40px] saturate-[150%] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">Next Deadline</span>
            <GraduationCap className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-white">6</span>
              <span className="text-sm font-mono text-[#A0A0A0]">days left</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2 truncate">CSC2001F Midterm Exam 1 (25%)</p>
          </div>
          <Link
            href="/exams"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 transition-colors"
          >
            View All Deadlines
          </Link>
        </div>
      </div>
    </div>
  );
}

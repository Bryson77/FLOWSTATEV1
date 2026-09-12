'use client';

import { BarChart3, Flame, Clock, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

const SUBJECT_HOURS = [
  { code: 'CSC2001F', name: 'Computer Science', hours: 14.5, target: 12, color: '#3B82F6' },
  { code: 'MTH2000S', name: 'Linear Algebra', hours: 8.0, target: 10, color: '#8B5CF6' },
  { code: 'INF2006F', name: 'Database Systems', hours: 6.5, target: 8, color: '#10B981' }
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Subject Mastery & Trends</h1>
        <p className="mt-1 text-[#A0A0A0]">Hours invested per subject vs. targeted semester milestones.</p>
      </div>

      {/* Top Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-[40px]">
          <span className="text-xs text-[#A0A0A0] uppercase font-semibold">Total Focused (This Month)</span>
          <p className="font-mono text-3xl sm:text-4xl font-bold text-white mt-2">29.0 hrs</p>
          <span className="text-xs text-zinc-300 font-mono mt-1 block">+14% vs last month</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-[40px]">
          <span className="text-xs text-[#A0A0A0] uppercase font-semibold">Longest Study Streak</span>
          <p className="font-mono text-3xl sm:text-4xl font-bold text-white mt-2">14 days</p>
          <span className="text-xs text-zinc-400 font-mono mt-1 block">Active streak: 4 days</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-[40px]">
          <span className="text-xs text-[#A0A0A0] uppercase font-semibold">Streak Freezes Available</span>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheck className="h-7 w-7 text-blue-400" />
            <p className="font-mono text-3xl sm:text-4xl font-bold text-white">1</p>
          </div>
          <span className="text-xs text-zinc-400 font-mono mt-1 block">+1 earned every 7 consecutive days</span>
        </div>
      </div>

      {/* Subject Hours Progress Bar List */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] backdrop-blur-[40px] p-6 space-y-6">
        <h3 className="font-display text-lg font-semibold text-white">Subject Hours vs Target (Weekly)</h3>

        <div className="space-y-4">
          {SUBJECT_HOURS.map(sub => {
            const percent = Math.min(100, Math.round((sub.hours / sub.target) * 100));

            return (
              <div key={sub.code} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#A0A0A0] font-semibold">{sub.code}</span>
                    <span className="text-white font-medium">{sub.name}</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-300">
                    {sub.hours}h / {sub.target}h ({percent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: sub.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GitHub-style Contribution Consistency Mockup */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] backdrop-blur-[40px] p-6">
        <h3 className="font-display text-lg font-semibold text-white mb-2">Study Heatmap</h3>
        <p className="text-xs text-[#A0A0A0] mb-4">Past 12 weeks of daily focus session activity.</p>

        <div className="flex gap-1.5 overflow-x-auto py-2">
          {Array.from({ length: 24 }).map((_, weekIdx) => (
            <div key={weekIdx} className="space-y-1.5 flex-shrink-0">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const activity = (weekIdx * 7 + dayIdx) % 5;
                const opacity =
                  activity === 0 ? 'bg-white/5' :
                  activity === 1 ? 'bg-white/20' :
                  activity === 2 ? 'bg-white/40' :
                  activity === 3 ? 'bg-white/70' : 'bg-white';

                return (
                  <div
                    key={dayIdx}
                    className={`h-3 w-3 rounded-sm ${opacity} transition-all hover:scale-125`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

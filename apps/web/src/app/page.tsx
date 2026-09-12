import Link from 'next/link';
import { Calendar, Layers, Timer, Trophy, ArrowRight, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Top Glass Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-[40px] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold tracking-tight text-white">FlowState</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Study OS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs text-[#A0A0A0] hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.97]"
            >
              Open Cockpit
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-[40px]">
          <Flame className="h-4 w-4 text-amber-400 fill-amber-400/20" />
          <span className="text-xs font-medium text-zinc-300">Phase 1 Release · True Black + Fluid Glass</span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white leading-tight">
            The Calm Academic Cockpit.
          </h1>
          <p className="font-serif italic text-2xl text-[#A0A0A0] font-light max-w-xl mx-auto">
            "stop switching between six disconnected tools."
          </p>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto pt-2">
            Timetable matrix, assessment countdowns, SM-2 flashcards, deep work timer, and squad leaderboards in one cohesive workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-2xl transition-all hover:scale-105 active:scale-[0.97]"
          >
            Launch Web Cockpit
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/timer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-white/10"
          >
            Try Focus Timer
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-20 text-left">
          <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-6">
            <Calendar className="h-6 w-6 text-blue-400 mb-4" />
            <h3 className="font-semibold text-white text-base">Timetable Matrix</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              5-day schedule matrix with dynamic Next-Up pill and lecture room venue coordinates.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-6">
            <CheckCircle2 className="h-6 w-6 text-white mb-4" />
            <h3 className="font-semibold text-white text-base">Assessment Countdown</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Chronological HUD tracking exam urgency, grade weighting percentages, and study hours.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-6">
            <Layers className="h-6 w-6 text-purple-400 mb-4" />
            <h3 className="font-semibold text-white text-base">SM-2 Flashcards</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Active recall 3D card flips with spaced repetition interval ratings (Again, Hard, Good, Easy).
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-6">
            <Timer className="h-6 w-6 text-amber-400 mb-4" />
            <h3 className="font-semibold text-white text-base">Focus Timer</h3>
            <p className="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              45/5/15 Pomodoro and deep work stopwatch bound directly to semester courses.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center text-xs text-zinc-600">
        <p>FlowState Study OS · Crafted with Apple HIG & fluid physics</p>
      </footer>
    </div>
  );
}

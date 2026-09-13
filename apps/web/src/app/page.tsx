import Link from 'next/link';
import {
  Calendar,
  Layers,
  Timer,
  ArrowRight,
  CheckCircle2,
  Flame,
  Clock,
  BarChart3,
  Users2,
  Play,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/90 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center font-display font-bold text-sm text-white">
              S
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white">Saktus</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                Academic OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.97]"
            >
              Launch Cockpit
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 shadow-sm">
          <Zap className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-xs font-medium text-zinc-300">
            Saktus OS · Apple HIG & Tactile Physics
          </span>
        </div>

        <div className="space-y-5 max-w-3xl mx-auto">
          <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            The Calm Academic Cockpit.
          </h1>
          <p className="font-serif italic text-2xl sm:text-3xl text-zinc-400 font-light max-w-xl mx-auto">
            "stop switching between six disconnected tools."
          </p>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto pt-2 leading-relaxed">
            Timetable matrix, assessment countdowns, SM-2 flashcards, deep work timer, and squad streaks in one cohesive workspace.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-lg transition-all hover:bg-zinc-200 active:scale-[0.97]"
          >
            Launch Web Cockpit
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/timer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-8 py-3.5 text-sm font-medium text-white transition-all hover:bg-white/[0.08] active:scale-[0.97]"
          >
            <Play className="h-3.5 w-3.5 fill-white text-white" />
            Try Focus Timer
          </Link>
        </div>

        {/* Product Showcase Card */}
        <div className="pt-12 max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-white/10 bg-[#09090b] p-6 sm:p-10 shadow-2xl overflow-hidden text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Timer Preview */}
              <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-6 text-center md:text-left space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-mono text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  FLOW SESSION
                </div>
                <div className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-white tnum">
                  25:00
                </div>
                <p className="text-xs text-zinc-400">
                  Adaptive Pomodoro with procedural soundscapes & course attribution.
                </p>
                <div className="pt-2">
                  <Link
                    href="/timer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-white hover:text-zinc-300"
                  >
                    Open Zen Mode <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Cockpit Stats Matrix */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                <div className="rounded-xl border border-white/[0.06] bg-black p-4 space-y-1">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <div className="font-display text-2xl font-bold text-white">4.5h</div>
                  <div className="text-[11px] text-zinc-500 uppercase font-mono">Daily Target</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black p-4 space-y-1">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <div className="font-display text-2xl font-bold text-white">14 Days</div>
                  <div className="text-[11px] text-zinc-500 uppercase font-mono">Study Streak</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black p-4 space-y-1">
                  <Layers className="h-4 w-4 text-purple-400" />
                  <div className="font-display text-2xl font-bold text-white">92%</div>
                  <div className="text-[11px] text-zinc-500 uppercase font-mono">SM-2 Retention</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black p-4 space-y-1 col-span-2 sm:col-span-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300">Live Study Room</span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-full">
                      Host Synced
                    </span>
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-3/4 rounded-full bg-white" />
                    </div>
                    <span className="text-xs font-mono text-zinc-400">75% Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-12 text-left">
          <div className="group rounded-xl border border-white/[0.08] bg-[#09090b] p-6 transition-all hover:border-white/20">
            <Calendar className="h-5 w-5 text-blue-400 mb-4 transition-transform group-hover:scale-105" />
            <h3 className="font-semibold text-white text-base">Timetable Matrix</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              5-day schedule matrix with dynamic Next-Up pill and lecture room venue coordinates.
            </p>
          </div>

          <div className="group rounded-xl border border-white/[0.08] bg-[#09090b] p-6 transition-all hover:border-white/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mb-4 transition-transform group-hover:scale-105" />
            <h3 className="font-semibold text-white text-base">Assessment Countdown</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Chronological HUD tracking exam urgency, grade weighting percentages, and study hours.
            </p>
          </div>

          <div className="group rounded-xl border border-white/[0.08] bg-[#09090b] p-6 transition-all hover:border-white/20">
            <Layers className="h-5 w-5 text-purple-400 mb-4 transition-transform group-hover:scale-105" />
            <h3 className="font-semibold text-white text-base">SM-2 Flashcards</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Standard, True/False & MCQ active recall with spaced repetition interval ratings.
            </p>
          </div>

          <div className="group rounded-xl border border-white/[0.08] bg-[#09090b] p-6 transition-all hover:border-white/20">
            <Timer className="h-5 w-5 text-amber-400 mb-4 transition-transform group-hover:scale-105" />
            <h3 className="font-semibold text-white text-base">Focus Timer</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Floating mini-player with procedural soundscapes bound directly to semester courses.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-10 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Saktus Academic OS · Apple HIG & Emil Kowalski Design Craft</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-zinc-300 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

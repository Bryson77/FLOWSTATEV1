'use client';

import Link from 'next/link';
import {
  Calendar,
  Layers,
  Timer,
  ArrowRight,
  CheckCircle2,
  Flame,
  Clock,
  Play
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-hidden font-sans transition-colors duration-150">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-6 py-4 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Saktus Logo"
              className="h-8 w-8 rounded-xl object-contain shadow-xs transition-transform hover:scale-105 btn-press"
            />
            <span className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Saktus</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="pill" />
            <Link
              href="/login"
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 dark:bg-white px-5 py-2 text-xs font-semibold text-white dark:text-black transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 btn-press"
            >
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center space-y-12">
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.08]">
            One app for your whole semester.
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto pt-2 leading-relaxed">
            Timetable. Flashcards. Focus timer. Study group. Saktus runs all of it.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 dark:bg-white px-8 py-3.5 text-sm font-semibold text-white dark:text-black shadow-sm transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 btn-press"
          >
            Start studying
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/timer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-8 py-3.5 text-sm font-medium text-zinc-900 dark:text-white transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 btn-press"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Focus Timer
          </Link>
        </div>

        {/* Positioning Card */}
        <div className="pt-6 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 text-left transition-colors">
            <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              You&apos;re using four apps to manage one semester. A calendar for classes, a flashcard app for exams, a timer for focus, a group chat for your study group. Saktus replaces all four.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 text-left max-w-4xl mx-auto">
          <div className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 transition-all hover:border-zinc-400 dark:hover:border-zinc-600">
            <Calendar className="h-5 w-5 text-zinc-900 dark:text-white mb-4" />
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Built for a semester</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              Add your classes once, including the ones that repeat every week. Track assignment deadlines and exam dates in the same view. No setup beyond the first ten minutes.
            </p>
          </div>

          <div className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 transition-all hover:border-zinc-400 dark:hover:border-zinc-600">
            <Layers className="h-5 w-5 text-zinc-900 dark:text-white mb-4" />
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Spaced repetition, done properly</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              Saktus schedules your reviews using the same spacing model researchers use to test memory retention. Tag your cards by subject and study whatever&apos;s actually due today.
            </p>
          </div>

          <div className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 transition-all hover:border-zinc-400 dark:hover:border-zinc-600">
            <Timer className="h-5 w-5 text-zinc-900 dark:text-white mb-4" />
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Time you can actually see</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              Start a session. Saktus logs it. Check your total hours for the day, the week, the month. That&apos;s the whole feature.
            </p>
          </div>

          <div className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 transition-all hover:border-zinc-400 dark:hover:border-zinc-600">
            <CheckCircle2 className="h-5 w-5 text-zinc-900 dark:text-white mb-4" />
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Study with people, on your terms</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              Join a live study room with friends when you want company. Keep a streak going without a guilt notification. Check the leaderboard against people you know, not strangers on the internet.
            </p>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="pt-12 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-center space-y-4">
            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
              Built for students, by a student
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
              No ads. No tracking you didn&apos;t agree to. Just the tools for getting through the term.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 dark:bg-white px-7 py-3 text-xs font-semibold text-white dark:text-black shadow-sm transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 btn-press"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800 py-10 text-center text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© Saktus · One app for your whole semester.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black dark:hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-black dark:hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

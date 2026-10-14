'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Layers,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Smartphone,
  Timer,
  Users,
  X,
  Sparkles,
  Shield,
  Heart,
  Flame,
  Coffee,
  ThumbsUp
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTimerPlaying, setIsTimerPlaying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(1458); // 24:18
  const [cardRevealed, setCardRevealed] = useState(false);
  const [spotlightFlipped, setSpotlightFlipped] = useState(false);
  const [studyPeriod, setStudyPeriod] = useState<'week' | 'today'>('week');
  const [cheerCounts, setCheerCounts] = useState({ clap: 12, fire: 18, coffee: 8, heart: 15 });
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleCheer = (type: keyof typeof cheerCounts) => {
    setCheerCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
  };

  const handleTimerToggle = () => {
    setIsTimerPlaying((prev) => !prev);
  };

  const handleTimerReset = () => {
    setIsTimerPlaying(false);
    setTimerSeconds(1500); // 25:00
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const faqItems = [
    {
      q: 'What is Saktus?',
      a: 'Saktus is a free study platform that brings together flashcards, a daily schedule, a focus timer, and ways to study with friends.',
    },
    {
      q: 'Is Saktus free?',
      a: 'Yes. Saktus is free to use. There is no paid plan required to access the core experience.',
    },
    {
      q: 'Can I study with my friends?',
      a: 'Saktus is designed to make studying more social. Depending on the current release, this may include connecting with friends, sharing flashcard decks, and comparing study time. The published answer must match features that are actually available.',
    },
    {
      q: 'Can I share flashcards?',
      a: 'Saktus is designed to support sharing useful revision decks. Only promise deck sharing as available once the sharing workflow is live.',
    },
    {
      q: 'Can friends see how long I studied?',
      a: 'Study-time visibility should be limited to the sharing settings and people you choose. The product must make those settings clear. Do not publish this answer until the actual visibility controls are implemented and verified.',
    },
    {
      q: 'How does the focus timer work?',
      a: 'The focus timer supports Pomodoro-style study sessions: work for a set block of time, then take a break. Describe specific durations or automatic transitions only if implemented.',
    },
    {
      q: 'Can I use Saktus on my phone?',
      a: 'You can use the current web experience. A dedicated mobile app is coming soon.',
    },
    {
      q: 'Who is Saktus for?',
      a: 'Saktus is for students who want a clearer way to plan their study day, practise course material, focus on a task, and study alongside friends.',
    },
    {
      q: 'Why did the name change from FlowState Productivity?',
      a: 'Saktus is the new name for the project formerly known as FlowState Productivity. The focus remains on helping students organise their study routine and learn alongside others.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black font-sans antialiased">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#292929] bg-[#000000]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 btn-press">
              <img
                src="/icon.png"
                alt="Saktus Logo"
                className="h-8 w-8 rounded-lg object-contain border border-[#292929]"
              />
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Saktus
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#B3B3B3]">
            <a href="#tools" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#social" className="hover:text-white transition-colors">
              Study with friends
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
          </nav>

          {/* Right-side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#B3B3B3] hover:text-white transition-colors px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start for free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors btn-press"
            >
              Start for free
            </Link>
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-lg border border-[#292929] bg-[#080808] text-[#B3B3B3] hover:text-white hover:border-[#454545] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#292929] bg-[#080808] px-6 py-6 space-y-4">
            <nav className="flex flex-col space-y-3 text-base text-[#B3B3B3]">
              <a
                href="#tools"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-1"
              >
                Product
              </a>
              <a
                href="#social"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-1"
              >
                Study with friends
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-1"
              >
                How it works
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white transition-colors py-1"
              >
                About
              </a>
            </nav>
            <div className="border-t border-[#292929] pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-sm font-medium text-[#B3B3B3] hover:text-white py-2"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors btn-press"
              >
                Start studying for free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 max-w-5xl mx-auto text-center space-y-8">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#292929] bg-[#080808] text-xs font-medium text-[#B3B3B3]">
          <Sparkles className="h-3.5 w-3.5 text-white" />
          <span>A study platform made by a student, for students</span>
        </div>

        {/* Hero Title & Subhead */}
        <div className="space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05]">
            Study better, together.
          </h1>
          <p className="text-lg sm:text-xl text-[#B3B3B3] leading-relaxed max-w-2xl mx-auto">
            Plan your day, practise with flashcards, and focus with a timer. Study alongside friends, share what you’re learning, and see the time you’re all putting in — all in one free study space.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/login?mode=signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-black hover:bg-zinc-200 transition-colors btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Start studying for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#292929] bg-[#080808] px-7 py-3.5 text-base font-medium text-white hover:border-[#454545] hover:bg-[#101010] transition-colors btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            See how it works
          </a>
        </div>

        {/* Microcopy */}
        <p className="text-xs text-[#808080] pt-1">
          Free to use. Available on the web. Mobile app coming soon.
        </p>

        {/* 3. Hero Visual Preview (Interactive Product UI Showcase) */}
        <div className="pt-8 text-left">
          <div className="rounded-2xl border border-[#292929] bg-[#080808] p-4 sm:p-6 shadow-2xl overflow-hidden">
            {/* Top Workspace Frame Header */}
            <div className="flex items-center justify-between border-b border-[#292929] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#292929]" />
                <span className="h-3 w-3 rounded-full bg-[#292929]" />
                <span className="h-3 w-3 rounded-full bg-[#292929]" />
                <span className="ml-2 text-xs font-mono text-[#808080]">saktus.app/workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-[#B3B3B3]">Active Session: Cellular Respiration</span>
              </div>
            </div>

            {/* Grid: Study Workspace + Friend Activity Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Individual Study Workspace (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Focus Timer Preview */}
                <div className="rounded-xl border border-[#292929] bg-[#101010] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium uppercase tracking-wider text-[#B3B3B3]">
                        Focus Timer
                      </span>
                    </div>
                    <span className="text-xs text-[#808080] font-mono">25m focus · 5m break</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-5xl font-mono font-bold tracking-tight text-white tnum">
                        {formatTimer(timerSeconds)}
                      </div>
                      <p className="text-xs text-[#808080] mt-1">Biology 101 — Deep Work</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTimerToggle}
                        aria-label={isTimerPlaying ? 'Pause timer' : 'Start timer'}
                        className="p-3 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors btn-press"
                      >
                        {isTimerPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleTimerReset}
                        aria-label="Reset timer"
                        className="p-3 rounded-lg border border-[#292929] bg-[#080808] text-[#B3B3B3] hover:text-white hover:border-[#454545] transition-colors btn-press"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Flashcard Active Recall Preview */}
                <div className="rounded-xl border border-[#292929] bg-[#101010] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium uppercase tracking-wider text-[#B3B3B3]">
                        Flashcard Review
                      </span>
                    </div>
                    <span className="text-xs text-[#808080] font-mono">Card 14 of 48</span>
                  </div>

                  <div className="rounded-lg border border-[#292929] bg-[#080808] p-4 space-y-3">
                    <p className="text-xs text-[#808080] uppercase tracking-wide">Question</p>
                    <p className="text-sm sm:text-base font-medium text-white">
                      What is the primary role of ATP synthase in cellular respiration?
                    </p>

                    {cardRevealed ? (
                      <div className="pt-2 border-t border-[#292929] space-y-2">
                        <p className="text-xs text-[#808080] uppercase tracking-wide">Answer</p>
                        <p className="text-xs sm:text-sm text-[#B3B3B3]">
                          It synthesises ATP from ADP and inorganic phosphate using the electrochemical proton gradient across the inner mitochondrial membrane.
                        </p>
                      </div>
                    ) : null}

                    <div className="pt-1">
                      <button
                        onClick={() => setCardRevealed((prev) => !prev)}
                        className="text-xs font-medium text-white underline underline-offset-4 hover:text-[#B3B3B3] transition-colors btn-press"
                      >
                        {cardRevealed ? 'Hide answer' : 'Reveal answer'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Daily Schedule Mini-strip */}
                <div className="rounded-xl border border-[#292929] bg-[#101010] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-white" />
                      <span className="font-medium uppercase tracking-wider">Today&apos;s Schedule</span>
                    </div>
                    <span className="text-[#808080] font-mono">3 blocks scheduled</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-[#292929]">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-white">09:00 — Organic Chemistry</span>
                      </div>
                      <span className="text-[#808080] font-mono">Completed</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-white/20">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        <span className="font-medium text-white">11:30 — Molecular Biology</span>
                      </div>
                      <span className="text-white font-mono">In progress</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-[#292929]">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#808080]" />
                        <span className="text-[#B3B3B3]">14:00 — Genetics Review</span>
                      </div>
                      <span className="text-[#808080] font-mono">Upcoming</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Friend Study Activity & Time Comparison (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Study Room Friends Panel */}
                <div className="rounded-xl border border-[#292929] bg-[#101010] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium uppercase tracking-wider text-[#B3B3B3]">
                        Bio Study Room
                      </span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono">4 studying now</span>
                  </div>

                  {/* Friends List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-[#292929]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-zinc-800 border border-[#292929] flex items-center justify-center text-xs font-medium text-white">
                          SK
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">Sarah K.</p>
                          <p className="text-[11px] text-[#808080]">Flashcards · Cell Bio</p>
                        </div>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-[#292929]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-zinc-800 border border-[#292929] flex items-center justify-center text-xs font-medium text-white">
                          AM
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">Alex M.</p>
                          <p className="text-[11px] text-[#808080]">Focus Session (25m)</p>
                        </div>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-[#292929]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-zinc-800 border border-[#292929] flex items-center justify-center text-xs font-medium text-white">
                          LP
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">Liam P.</p>
                          <p className="text-[11px] text-[#808080]">Daily Schedule</p>
                        </div>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080808] border border-white/20">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-white text-black font-semibold flex items-center justify-center text-xs">
                          You
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">You</p>
                          <p className="text-[11px] text-[#808080]">Cellular Respiration</p>
                        </div>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                  </div>

                  {/* Tactile Cheer Bar */}
                  <div className="pt-2 border-t border-[#292929]">
                    <p className="text-[11px] text-[#808080] mb-2">Send encouragement:</p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => toggleCheer('clap')}
                        className="flex items-center justify-center gap-1.5 p-1.5 rounded-lg border border-[#292929] bg-[#080808] text-xs text-[#B3B3B3] hover:text-white hover:border-[#454545] transition-colors btn-press"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span className="font-mono tnum text-[11px]">{cheerCounts.clap}</span>
                      </button>
                      <button
                        onClick={() => toggleCheer('fire')}
                        className="flex items-center justify-center gap-1.5 p-1.5 rounded-lg border border-[#292929] bg-[#080808] text-xs text-[#B3B3B3] hover:text-white hover:border-[#454545] transition-colors btn-press"
                      >
                        <Flame className="h-3 w-3" />
                        <span className="font-mono tnum text-[11px]">{cheerCounts.fire}</span>
                      </button>
                      <button
                        onClick={() => toggleCheer('coffee')}
                        className="flex items-center justify-center gap-1.5 p-1.5 rounded-lg border border-[#292929] bg-[#080808] text-xs text-[#B3B3B3] hover:text-white hover:border-[#454545] transition-colors btn-press"
                      >
                        <Coffee className="h-3 w-3" />
                        <span className="font-mono tnum text-[11px]">{cheerCounts.coffee}</span>
                      </button>
                      <button
                        onClick={() => toggleCheer('heart')}
                        className="flex items-center justify-center gap-1.5 p-1.5 rounded-lg border border-[#292929] bg-[#080808] text-xs text-[#B3B3B3] hover:text-white hover:border-[#454545] transition-colors btn-press"
                      >
                        <Heart className="h-3 w-3" />
                        <span className="font-mono tnum text-[11px]">{cheerCounts.heart}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Study Time Comparison Card */}
                <div className="rounded-xl border border-[#292929] bg-[#101010] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#B3B3B3]">
                        This week · Study time
                      </p>
                      <p className="text-[11px] text-[#808080] mt-0.5">Shared effort, not pressure</p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#292929] bg-[#080808] text-[#808080]">
                      Friends only
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#B3B3B3]">Sarah K.</span>
                        <span className="font-mono text-white tnum">14.5 hrs</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#292929] overflow-hidden">
                        <div className="h-full bg-white/70 rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#B3B3B3]">Alex M.</span>
                        <span className="font-mono text-white tnum">12.0 hrs</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#292929] overflow-hidden">
                        <div className="h-full bg-white/70 rounded-full" style={{ width: '70%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-white font-medium">You</span>
                        <span className="font-mono text-white font-medium tnum">11.2 hrs</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#292929] overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#B3B3B3]">Liam P.</span>
                        <span className="font-mono text-white tnum">9.5 hrs</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#292929] overflow-hidden">
                        <div className="h-full bg-white/70 rounded-full" style={{ width: '55%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Supporting Statement */}
      <section className="py-24 px-4 sm:px-6 border-t border-[#292929]">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Your study tools, with your people.
          </h2>
          <p className="text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
            Saktus brings the practical parts of studying into one place — planning what to do, testing what you know, focusing on a session, and keeping up with friends who are working towards their own goals.
          </p>
        </div>
      </section>

      {/* 5. Social-Study Feature Section */}
      <section id="social" className="py-24 px-4 sm:px-6 border-t border-[#292929] scroll-mt-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              Studying doesn&apos;t have to be solo
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Bring your friends into the routine.
            </h2>
            <p className="text-base text-[#B3B3B3] leading-relaxed">
              Make studying a shared effort. Connect with friends, exchange useful flashcard decks, and compare study time to see how everyone is showing up. Keep the focus on the work — and help one another stay consistent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-4 hover:border-[#454545] transition-colors">
              <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Study alongside friends
              </h3>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Know who you’re studying with and make individual study sessions feel less isolated. Saktus should support a sense of shared momentum without turning every session into a public performance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-4 hover:border-[#454545] transition-colors">
              <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Share flashcards
              </h3>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Pass useful decks between friends instead of rebuilding the same revision material from scratch. Shared cards should make it easier to learn from one another’s preparation.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-4 hover:border-[#454545] transition-colors">
              <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                See the time you put in
              </h3>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Compare study time over a clearly defined period, such as a day or week, with friends who have chosen to share their activity. Use the comparison as encouragement, not as a judgement of who is the better student.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#B3B3B3] transition-colors btn-press"
            >
              Start studying with Saktus
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Tools Section */}
      <section id="tools" className="py-24 px-4 sm:px-6 border-t border-[#292929] scroll-mt-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              The essentials, in one workspace
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Plan it. Practise it. Focus on it.
            </h2>
            <p className="text-base text-[#B3B3B3] leading-relaxed">
              A study system only helps when you can actually use it. Saktus keeps the core tools close together so you can move from planning a session to doing the work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tool 1: Flashcards */}
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-4 hover:border-[#454545] transition-colors flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">Flashcards</h3>
                <p className="text-sm font-medium text-white">
                  Recall the answer. Don’t just recognise the page.
                </p>
                <p className="text-sm text-[#B3B3B3] leading-relaxed">
                  Use flashcards to test what you remember, spot gaps in your understanding, and organise revision around the topics you need to learn.
                </p>
              </div>
              <div className="pt-4 border-t border-[#292929]">
                <span className="text-xs font-mono text-[#808080]">SM-2 active recall algorithm</span>
              </div>
            </div>

            {/* Tool 2: Focus Timer */}
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-4 hover:border-[#454545] transition-colors flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
                  <Timer className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">Focus timer</h3>
                <p className="text-sm font-medium text-white">
                  Give one task a clear start and finish.
                </p>
                <p className="text-sm text-[#B3B3B3] leading-relaxed">
                  Use Pomodoro-style sessions to work in manageable blocks, with breaks between them. Keep your attention on the task in front of you.
                </p>
              </div>
              <div className="pt-4 border-t border-[#292929]">
                <span className="text-xs font-mono text-[#808080]">Pomodoro intervals & full reset</span>
              </div>
            </div>

            {/* Tool 3: Daily Schedule */}
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-4 hover:border-[#454545] transition-colors flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-lg bg-[#101010] border border-[#292929] flex items-center justify-center text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">Daily schedule</h3>
                <p className="text-sm font-medium text-white">
                  Make your study day easier to follow.
                </p>
                <p className="text-sm text-[#B3B3B3] leading-relaxed">
                  Organise study blocks around the day ahead, keep your priorities visible, and know what you intend to work on next.
                </p>
              </div>
              <div className="pt-4 border-t border-[#292929]">
                <span className="text-xs font-mono text-[#808080]">Priority task grouping</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 border-t border-[#292929] scroll-mt-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              A simple routine
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              From “I should study” to getting started.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-3">
              <div className="text-xs font-mono font-semibold text-white">01 — Make a plan</div>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Add study blocks to your day and decide what deserves your attention.
              </p>
            </div>

            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-3">
              <div className="text-xs font-mono font-semibold text-white">02 — Learn actively</div>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Use flashcards to test yourself and share useful decks with friends when you want to study together.
              </p>
            </div>

            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-3">
              <div className="text-xs font-mono font-semibold text-white">03 — Focus on one session</div>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                Start a timer and give the task in front of you a dedicated block of time.
              </p>
            </div>

            <div className="rounded-xl border border-[#292929] bg-[#080808] p-6 space-y-3">
              <div className="text-xs font-mono font-semibold text-white">04 — Keep each other going</div>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                See the study time friends have chosen to share and use it as a nudge to return to your own plan.
              </p>
            </div>
          </div>

          <p className="text-base text-white font-medium text-center pt-4">
            Your own routine. Your friends beside you. One place to study.
          </p>
        </div>
      </section>

      {/* 8. Flashcards Spotlight */}
      <section className="py-24 px-4 sm:px-6 border-t border-[#292929]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              Built for active recall
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Make revision something you do, not just something you read.
            </h2>
            <p className="text-base text-[#B3B3B3] leading-relaxed">
              Flashcards put your memory to work. Test what you know, notice what needs another look, and build decks around the subjects and topics you’re studying. When deck sharing is available, learn from the material your friends have prepared too.
            </p>
            <div>
              <Link
                href="/login?redirect=/flashcards"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors btn-press"
              >
                Explore flashcards
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Interactive Flashcard Deck Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[#292929] bg-[#080808] p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#808080]">
                <span className="font-mono">Human Physiology · Deck</span>
                <span>48 cards total</span>
              </div>

              <div
                onClick={() => setSpotlightFlipped((prev) => !prev)}
                className="cursor-pointer rounded-xl border border-[#292929] bg-[#101010] p-6 min-h-[180px] flex flex-col justify-between hover:border-[#454545] transition-all btn-press"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#808080]">
                    {spotlightFlipped ? 'Card Back (Answer)' : 'Card Front (Question)'}
                  </span>
                  <p className="text-base sm:text-lg font-medium text-white">
                    {spotlightFlipped
                      ? 'Action potentials are triggered when membrane depolarisation reaches the threshold potential (~ -55 mV), opening voltage-gated Na⁺ channels.'
                      : 'How does an action potential initiate across a neuronal cell membrane?'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#292929] text-xs text-[#808080]">
                  <span>Click card to flip</span>
                  <span className="font-mono text-white">Tap to reveal</span>
                </div>
              </div>

              {/* Memory rating indicators */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-[#101010] border border-[#292929] text-[#B3B3B3]">
                  Again
                </div>
                <div className="p-2 rounded-lg bg-[#101010] border border-[#292929] text-[#B3B3B3]">
                  Hard
                </div>
                <div className="p-2 rounded-lg bg-[#101010] border border-[#292929] text-white font-medium">
                  Good
                </div>
                <div className="p-2 rounded-lg bg-[#101010] border border-[#292929] text-[#B3B3B3]">
                  Easy
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Study-Time Comparison Spotlight */}
      <section className="py-24 px-4 sm:px-6 border-t border-[#292929]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 order-2 lg:order-1">
            <div className="rounded-2xl border border-[#292929] bg-[#080808] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
                    Study Activity
                  </span>
                  <h4 className="text-base font-semibold text-white mt-1">
                    Study Group · Focused Hours
                  </h4>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-[#292929] bg-[#101010] p-1">
                  <button
                    onClick={() => setStudyPeriod('week')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      studyPeriod === 'week' ? 'bg-white text-black' : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    This week
                  </button>
                  <button
                    onClick={() => setStudyPeriod('today')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      studyPeriod === 'today' ? 'bg-white text-black' : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#B3B3B3]">Sarah K.</span>
                    <span className="font-mono text-white tnum">
                      {studyPeriod === 'week' ? '14.5 hrs' : '3.2 hrs'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#101010] border border-[#292929] overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-300"
                      style={{ width: studyPeriod === 'week' ? '85%' : '75%' }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-medium">You</span>
                    <span className="font-mono text-white font-medium tnum">
                      {studyPeriod === 'week' ? '11.2 hrs' : '2.8 hrs'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#101010] border border-[#292929] overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: studyPeriod === 'week' ? '65%' : '65%' }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#B3B3B3]">Alex M.</span>
                    <span className="font-mono text-white tnum">
                      {studyPeriod === 'week' ? '12.0 hrs' : '2.1 hrs'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#101010] border border-[#292929] overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-300"
                      style={{ width: studyPeriod === 'week' ? '70%' : '50%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#292929] flex items-center justify-between text-xs text-[#808080]">
                <span>Scope: Selected friends only</span>
                <span className="font-mono">Effort, not competition</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              Shared effort, not pressure
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              See the time. Keep your own pace.
            </h2>
            <div className="space-y-4 text-base text-[#B3B3B3] leading-relaxed">
              <p>
                Your study time tells one part of the story. See your own focus time alongside friends who choose to share theirs, and use that visibility to encourage one another to keep showing up.
              </p>
              <p>
                No shame for a quiet day. No claim that the longest timer means the best learning. The point is to make effort visible and studying feel a little less solitary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Free Promise */}
      <section className="py-24 px-4 sm:px-6 border-t border-[#292929]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
            No subscription standing between you and your next session
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Everything you need to get started. Free.
          </h2>
          <p className="text-base sm:text-lg text-[#B3B3B3] leading-relaxed max-w-2xl mx-auto">
            Saktus is free to use. The study tools and social features described here are part of one student-focused experience — not a maze of plans or a trial that expires.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left max-w-2xl mx-auto">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#292929] bg-[#080808]">
              <Check className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <p className="text-sm text-[#B3B3B3]">No credit card required to start</p>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#292929] bg-[#080808]">
              <Check className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <p className="text-sm text-[#B3B3B3]">No expiring free trial period</p>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#292929] bg-[#080808]">
              <Check className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <p className="text-sm text-[#B3B3B3]">No paid study-tool paywalls</p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-black hover:bg-zinc-200 transition-colors btn-press"
            >
              Start studying for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Student-Built Story */}
      <section id="about" className="py-24 px-4 sm:px-6 border-t border-[#292929] scroll-mt-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
            Built from the student side of the desk
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Made by a student. For students.
          </h2>
          <div className="space-y-4 text-base text-[#B3B3B3] leading-relaxed">
            <p>
              Saktus began as FlowState Productivity with a straightforward idea: make it easier to plan study time and follow through. It is being built around real student routines — preparing for assessments, keeping track of subjects, practising what you know, and finding a little momentum alongside friends.
            </p>
            <p className="text-white font-medium">
              The name has changed to Saktus. The reason for building it has not.
            </p>
          </div>
        </div>
      </section>

      {/* 12. Mobile App Section */}
      <section className="py-24 px-4 sm:px-6 border-t border-[#292929]">
        <div className="max-w-4xl mx-auto rounded-2xl border border-[#292929] bg-[#080808] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              Coming soon
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Your study routine, on mobile.
            </h2>
            <p className="text-base text-[#B3B3B3] leading-relaxed">
              The Saktus mobile app is in development. For now, you can start with the web experience.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors btn-press"
              >
                Start on the web
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Minimalist Phone Outline Preview */}
          <div className="w-56 h-80 rounded-[32px] border-2 border-[#292929] bg-[#101010] p-3 flex flex-col justify-between shrink-0 shadow-lg">
            <div className="w-16 h-3 rounded-full bg-[#292929] mx-auto" />
            <div className="space-y-2 text-center py-4">
              <Smartphone className="h-8 w-8 text-white mx-auto opacity-70" />
              <p className="text-xs font-semibold text-white">Saktus Mobile</p>
              <p className="text-[11px] text-[#808080]">In active testing</p>
            </div>
            <div className="w-10 h-1 rounded-full bg-[#292929] mx-auto" />
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 border-t border-[#292929] scroll-mt-20">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#808080]">
              Questions & answers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-[#292929] bg-[#080808] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 text-base font-semibold text-white hover:text-[#B3B3B3] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#808080] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-[#B3B3B3] leading-relaxed border-t border-[#292929]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 14. Final CTA */}
      <section className="py-24 px-4 sm:px-6 border-t border-[#292929] bg-[#000000]">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Your next study session doesn&apos;t have to be solo.
          </h2>
          <p className="text-base sm:text-lg text-[#B3B3B3] leading-relaxed max-w-xl mx-auto">
            Make a plan, choose a topic, start a focus session, or invite a friend into your study routine. Saktus is free to use.
          </p>
          <div className="pt-2">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-black hover:bg-zinc-200 transition-colors btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start studying for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 15. Footer */}
      <footer className="border-t border-[#292929] bg-[#000000] py-16 px-4 sm:px-6 text-sm text-[#B3B3B3]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/icon.png"
                alt="Saktus Logo"
                className="h-6 w-6 rounded-md object-contain border border-[#292929]"
              />
              <span className="font-display text-lg font-bold text-white tracking-tight">Saktus</span>
            </div>
            <p className="text-xs text-[#808080] leading-relaxed">
              Saktus — a study platform made by a student, for students.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">Product</p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#tools" className="hover:text-white transition-colors">
                  Study tools
                </a>
              </li>
              <li>
                <a href="#social" className="hover:text-white transition-colors">
                  Study with friends
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How it works
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">Account</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/login?mode=signup" className="hover:text-white transition-colors">
                  Start for free
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">Information</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-12 mt-12 border-t border-[#292929] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#808080]">
          <p>© {new Date().getFullYear()} Saktus. Free for students everywhere.</p>
          <p>Pure black study workspace · No advertisements</p>
        </div>
      </footer>
    </div>
  );
}

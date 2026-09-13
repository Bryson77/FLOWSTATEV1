'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Calendar, GraduationCap, Layers, Flame, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NextClass {
  name: string;
  code: string;
  time: string;
  venue: string;
}

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [todaySessionsCount, setTodaySessionsCount] = useState<number>(0);
  const [cardsDueCount, setCardsDueCount] = useState<number>(0);
  const [assessmentsCount, setAssessmentsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCockpitData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Please sign in to view your cockpit.');

      const today = new Date();
      const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon, 7=Sun
      const todayDateStr = today.toISOString().split('T')[0];

      // Parallelize queries per Estavo performance standard
      const [profileRes, classesRes, sessionsRes, cardsRes, assessmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('timetable_classes').select('*, courses(name, code)').eq('user_id', user.id).order('start_time'),
        supabase.from('study_sessions').select('id, completed_at').eq('user_id', user.id).gte('completed_at', `${todayDateStr}T00:00:00.000Z`),
        supabase.from('flashcards').select('id, due_date').eq('user_id', user.id).lte('due_date', todayDateStr),
        supabase.from('assessments').select('id').eq('user_id', user.id).eq('completed', false),
      ]);

      setProfile(profileRes.data || { study_streak_days: 0, streak_freezes_available: 1 });
      setTodaySessionsCount(sessionsRes.data?.length || 0);
      setCardsDueCount(cardsRes.data?.length || 0);
      setAssessmentsCount(assessmentsRes.data?.length || 0);

      // Calculate Next Class Up
      const classes = classesRes.data || [];
      const todayClasses = classes.filter((c: any) => c.day_of_week === currentDayOfWeek);
      const currentTimeStr = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

      const upcoming = todayClasses.find((c: any) => (c.start_time?.slice(0, 5) || '00:00') >= currentTimeStr);
      if (upcoming) {
        setNextClass({
          name: upcoming.courses?.name || 'Class',
          code: upcoming.courses?.code || '',
          time: `Today · ${upcoming.start_time?.slice(0, 5)} - ${upcoming.end_time?.slice(0, 5)}`,
          venue: upcoming.venue || 'Campus Venue',
        });
      } else if (classes.length > 0) {
        // Fallback to first class in timetable
        const first = classes[0];
        const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setNextClass({
          name: first.courses?.name || 'Class',
          code: first.courses?.code || '',
          time: `${days[first.day_of_week]} · ${first.start_time?.slice(0, 5)}`,
          venue: first.venue || 'Campus Venue',
        });
      } else {
        setNextClass(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load cockpit data.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCockpitData();
  }, [fetchCockpitData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header & Streak Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {getGreeting()}
          </h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">Here is your academic overview for today.</p>
        </div>

        {/* Streak Counter Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#111111] px-4 py-2 backdrop-blur-[40px]">
          <Flame className="h-4 w-4 text-amber-400 fill-amber-400/20" />
          <span className="font-mono text-xs font-semibold text-white">
            {profile?.study_streak_days || 0} Day Streak
          </span>
          <span className="text-[11px] text-[#4A4A4A] font-mono">
            | {profile?.streak_freezes_available || 1} freeze
          </span>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="rounded-xl border border-[#E74C3C]/30 bg-[#E74C3C]/10 p-4 text-xs text-[#E74C3C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchCockpitData} className="font-medium underline hover:text-white ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="h-32 w-full skeleton rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 w-full skeleton rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Next Up Class Banner */}
      {!loading && !errorMsg && (
        <div className="relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 backdrop-blur-[40px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0]">
                  Next Class Up
                </span>
              </div>

              {nextClass ? (
                <>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-1.5 leading-snug">
                    {nextClass.code} · {nextClass.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#A0A0A0]">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      {nextClass.time}
                    </span>
                    <span>{nextClass.venue}</span>
                  </div>
                </>
              ) : (
                <div className="mt-2">
                  <h2 className="font-display text-lg font-bold text-white">No classes scheduled</h2>
                  <p className="text-xs text-[#A0A0A0] mt-1">
                    Add your courses and timetable schedule to track lecture countdowns.
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/timetable"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-white transition-all hover:border-white/30 active:scale-[0.97]"
            >
              <span>View Schedule</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Cockpit Metric Cards */}
      {!loading && !errorMsg && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Focus Progress */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-[#A0A0A0] uppercase tracking-wider">
                Session Goal
              </span>
              <Link href="/timer" className="text-[#A0A0A0] hover:text-white transition-colors">
                <Play className="h-4 w-4" />
              </Link>
            </div>
            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-white">{todaySessionsCount}</span>
                <span className="text-sm text-[#A0A0A0] font-mono">/ 4 sessions today</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-[#1A1A1A] overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, (todaySessionsCount / 4) * 100)}%` }}
                />
              </div>
            </div>
            <Link
              href="/timer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:underline underline-offset-4"
            >
              <span>Start Focus Session</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 2: Active Recall SM-2 */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-[#A0A0A0] uppercase tracking-wider">
                Flashcards Due
              </span>
              <Link href="/flashcards" className="text-[#A0A0A0] hover:text-white transition-colors">
                <Layers className="h-4 w-4" />
              </Link>
            </div>
            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-white">{cardsDueCount}</span>
                <span className="text-sm text-[#A0A0A0] font-mono">cards due for review</span>
              </div>
              <p className="text-xs text-[#4A4A4A] mt-2 font-mono">
                SuperMemo SM-2 spaced repetition
              </p>
            </div>
            <Link
              href="/flashcards"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:underline underline-offset-4"
            >
              <span>Review Flashcards</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 3: Upcoming Assessments */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium text-[#A0A0A0] uppercase tracking-wider">
                Upcoming Exams
              </span>
              <Link href="/exams" className="text-[#A0A0A0] hover:text-white transition-colors">
                <GraduationCap className="h-4 w-4" />
              </Link>
            </div>
            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-white">{assessmentsCount}</span>
                <span className="text-sm text-[#A0A0A0] font-mono">active assessments</span>
              </div>
              <p className="text-xs text-[#4A4A4A] mt-2 font-mono">
                Weightings & study hour targets
              </p>
            </div>
            <Link
              href="/exams"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:underline underline-offset-4"
            >
              <span>View Assessments</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

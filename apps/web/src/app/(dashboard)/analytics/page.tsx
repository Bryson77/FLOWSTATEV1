'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Flame, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SubjectStat {
  code: string;
  name: string;
  hours: number;
  target: number;
  color: string;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalHoursMonth, setTotalHoursMonth] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [streakFreezes, setStreakFreezes] = useState(0);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});

  const supabase = createClient();

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        setLoading(false);
        return;
      }

      // 1. Fetch profile streak & freezes
      const { data: profile } = await supabase
        .from('profiles')
        .select('study_streak_days, longest_streak_days, streak_freezes_available')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setActiveStreak(profile.study_streak_days || 0);
        setLongestStreak(profile.longest_streak_days || profile.study_streak_days || 0);
        setStreakFreezes(profile.streak_freezes_available ?? 1);
      }

      // 2. Fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, code, name, target_hours_per_week, color')
        .eq('user_id', user.id);

      // 3. Fetch study sessions for current user (completed in last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('course_id, duration_seconds, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', ninetyDaysAgo.toISOString());

      // Aggregate monthly total (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let monthSeconds = 0;
      const courseSecondsMap: Record<string, number> = {};
      const heatMap: Record<string, number> = {};

      (sessions || []).forEach(sess => {
        const completedDate = sess.completed_at ? new Date(sess.completed_at) : null;
        if (completedDate && completedDate >= thirtyDaysAgo) {
          monthSeconds += sess.duration_seconds || 0;
        }

        if (sess.course_id) {
          courseSecondsMap[sess.course_id] = (courseSecondsMap[sess.course_id] || 0) + (sess.duration_seconds || 0);
        }

        if (completedDate) {
          const dateKey = completedDate.toISOString().split('T')[0];
          heatMap[dateKey] = (heatMap[dateKey] || 0) + 1;
        }
      });

      setTotalHoursMonth(Number((monthSeconds / 3600).toFixed(1)));
      setDailyCounts(heatMap);

      if (courses && courses.length > 0) {
        const stats: SubjectStat[] = courses.map(c => {
          const hours = Number(((courseSecondsMap[c.id] || 0) / 3600).toFixed(1));
          return {
            code: c.code,
            name: c.name,
            hours,
            target: c.target_hours_per_week || 10,
            color: c.color || '#3B82F6',
          };
        });
        setSubjectStats(stats);
      } else {
        setSubjectStats([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load study analytics. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Subject Mastery & Trends</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Hours invested per subject vs. targeted weekly milestones.</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={loadAnalytics} className="font-mono text-xs text-red-600 dark:text-red-400 underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* Top Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Total Focused (Last 30 Days)</span>
          {loading ? (
            <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded mt-2" />
          ) : (
            <p className="font-mono text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mt-2">{totalHoursMonth} hrs</p>
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 block">Live recorded sessions</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Current / Best Streak</span>
          {loading ? (
            <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded mt-2" />
          ) : (
            <p className="font-mono text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mt-2">{activeStreak} / {longestStreak} days</p>
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 block">Consecutive study days</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Streak Freezes</span>
          {loading ? (
            <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded mt-2" />
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck className="h-7 w-7 text-zinc-900 dark:text-white" />
              <p className="font-mono text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">{streakFreezes}</p>
            </div>
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 block">+1 earned every 7 study days</span>
        </div>
      </div>

      {/* Subject Hours Progress Bar List */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-6">
        <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Subject Hours vs Target (Weekly)</h3>

        {loading ? (
          <div className="space-y-4">
            <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            <div className="h-10 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
          </div>
        ) : subjectStats.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-display text-lg font-semibold text-zinc-900 dark:text-white">No courses registered yet</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Add your classes in the Schedule screen to automatically track focus hours per subject.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjectStats.map(sub => {
              const percent = Math.min(100, Math.round((sub.hours / sub.target) * 100));

              return (
                <div key={sub.code} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{sub.code}</span>
                      <span className="text-zinc-900 dark:text-white font-medium">{sub.name}</span>
                    </div>
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {sub.hours}h / {sub.target}h ({percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: sub.color || '#3B82F6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Study Heatmap */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white mb-2">Study Heatmap</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Past 16 weeks of daily focus session activity.</p>

        <div className="flex gap-1.5 overflow-x-auto py-2">
          {Array.from({ length: 16 }).map((_, weekIdx) => (
            <div key={weekIdx} className="space-y-1.5 flex-shrink-0">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const dayOffset = (15 - weekIdx) * 7 + (6 - dayIdx);
                const d = new Date();
                d.setDate(d.getDate() - dayOffset);
                const key = d.toISOString().split('T')[0];
                const count = dailyCounts[key] || 0;

                const opacity =
                  count === 0 ? 'bg-zinc-100 dark:bg-zinc-900' :
                  count === 1 ? 'bg-zinc-300 dark:bg-zinc-700' :
                  count === 2 ? 'bg-zinc-500 dark:bg-zinc-400' :
                  'bg-zinc-900 dark:bg-zinc-100';

                return (
                  <div
                    key={dayIdx}
                    title={`${key}: ${count} session(s)`}
                    className={`h-3 w-3 rounded-sm ${opacity} transition-all hover:scale-125 cursor-pointer`}
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


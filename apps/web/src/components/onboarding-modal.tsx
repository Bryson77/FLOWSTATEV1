'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  BookOpen,
  Clock,
  Users,
  Flame,
  ArrowRight,
  Check,
  Target,
  Bell,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120); // 2 hours default
  const [emailOptIn, setEmailOptIn] = useState(false); // Explicitly unchecked for POPIA
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_onboarding, daily_study_goal_minutes')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && profile.has_completed_onboarding === false) {
          if (profile.daily_study_goal_minutes) {
            setDailyGoalMinutes(profile.daily_study_goal_minutes);
          }
          setIsOpen(true);
        }
      } catch {
        // Silently catch to avoid blocking initial load
      }
    }

    checkOnboardingStatus();
  }, [supabase]);

  const handleComplete = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const userTimezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'Africa/Johannesburg';

      await supabase
        .from('profiles')
        .update({
          has_completed_onboarding: true,
          daily_study_goal_minutes: dailyGoalMinutes,
          email_notifications_opt_in: emailOptIn,
          timezone: userTimezone,
        })
        .eq('id', userId);

      setIsOpen(false);
      toast('Account configured!', 'success');
    } catch {
      toast('Failed to save preferences. You can update these anytime in settings.', 'error');
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl transition-colors">
        {/* Progress Dots */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <span className="font-display text-base font-bold text-zinc-900 dark:text-white">
            Welcome to Saktus
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-6 rounded-full transition-all ${
                step === 1 ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
            <span
              className={`h-1.5 w-6 rounded-full transition-all ${
                step === 2 ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
            <span
              className={`h-1.5 w-6 rounded-full transition-all ${
                step === 3 ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          </div>
        </div>

        {/* Step 1: Daily Study Goal */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <Target className="h-5 w-5" />
                <h3 className="text-lg font-bold">Set your daily study goal</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This target directly configures your weekly analytics chart and daily session tracker.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[60, 120, 180, 240].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDailyGoalMinutes(mins)}
                  className={`p-3 rounded-xl border text-center transition-all btn-press ${
                    dailyGoalMinutes === mins
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="text-base font-bold font-mono tnum">{mins / 60}h</div>
                  <div className="text-[11px] opacity-80">{mins} mins</div>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Selected target</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                {(dailyGoalMinutes / 60).toFixed(1)} hours / day
              </span>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full btn-press rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black py-3 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Next: Communication Preferences</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: POPIA Email Opt-in */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <Bell className="h-5 w-5" />
                <h3 className="text-lg font-bold">Email notification preferences</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                POPIA-compliant explicit opt-in. You decide whether to receive academic updates.
              </p>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
              <input
                type="checkbox"
                checked={emailOptIn}
                onChange={e => setEmailOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                  Receive study reminders and exam countdowns
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-relaxed">
                  We'll send notifications before upcoming assessments and streak alerts if you're about to lose progress. Zero spam.
                </span>
              </div>
            </label>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 btn-press rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black py-2.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
              >
                <span>Next: App Overview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Product Walkthrough */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-lg font-bold">What's in Saktus</h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Core tools to manage your studies every day.
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start gap-3">
                <Calendar className="h-4 w-4 text-zinc-700 dark:text-zinc-300 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Timetable & Schedule</h4>
                  <p className="text-[11px] text-zinc-500">Weekly lectures, tutorials, and exam venues organized by day.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start gap-3">
                <BookOpen className="h-4 w-4 text-zinc-700 dark:text-zinc-300 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Flashcards & Active Recall</h4>
                  <p className="text-[11px] text-zinc-500">SM-2 spaced repetition with standard, true/false, and multiple-choice cards.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start gap-3">
                <Clock className="h-4 w-4 text-zinc-700 dark:text-zinc-300 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Focus Timer & Fullscreen</h4>
                  <p className="text-[11px] text-zinc-500">Focus sessions with ambient soundscapes and task tracking.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start gap-3">
                <Users className="h-4 w-4 text-zinc-700 dark:text-zinc-300 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Friends & Study Rooms</h4>
                  <p className="text-[11px] text-zinc-500">Synchronous co-working rooms and friends leaderboard.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start gap-3">
                <Flame className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Daily Streaks & Freezes</h4>
                  <p className="text-[11px] text-zinc-500">Timezone-accurate streaks with automatic freeze protection every 7 study days.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 btn-press rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black py-2.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Get Started'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

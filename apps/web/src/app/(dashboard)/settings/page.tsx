"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Clock,
  Moon,
  Sun,
  ShieldAlert,
  LogOut,
  Save,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import { getSafeErrorMessage } from "@/lib/errors";

const STUDY_GOAL_OPTIONS = [15, 30, 45, 60, 90, 120];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(60);
  const [emailNotifications, setEmailNotifications] = useState(false);

  // Delete account confirmation
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setUniversity(data.university || "");
        setDegree(data.degree || "");
        setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
        setDailyGoalMinutes(data.daily_study_goal_minutes || 60);
        setEmailNotifications(data.email_notifications_opt_in ?? false);
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      toast(getSafeErrorMessage(err, "Failed to load settings."), "error");
    } finally {
      setLoading(false);
    }
  }, [router, supabase, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: username.trim() ? username.trim().toLowerCase() : null,
          university: university.trim() || null,
          degree: degree.trim() || null,
          timezone,
          daily_study_goal_minutes: dailyGoalMinutes,
          email_notifications_opt_in: emailNotifications,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUserId);

      if (error) throw error;

      toast("Settings updated successfully.", "success");
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to update settings."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: any) {
      toast("Error signing out.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      "Type 'DELETE' to permanently delete your Saktus account and all coursework data:"
    );

    if (confirmation !== "DELETE") {
      toast("Account deletion cancelled.", "info");
      return;
    }

    setIsDeletingAccount(true);
    try {
      if (currentUserId) {
        await supabase.from("profiles").delete().eq("id", currentUserId);
      }
      await supabase.auth.signOut();
      toast("Account removed.", "info");
      router.push("/login");
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to delete account."), "error");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-zinc-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Settings
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Manage your student profile, study targets, and application preferences.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Student Profile */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <User className="h-4 w-4 text-zinc-900 dark:text-white" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Student Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Username
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-2 text-xs text-zinc-400 font-mono">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                University / Institution
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. University of Toronto"
                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Degree / Major
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Sc. Computer Science"
                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Study Targets & Timezone */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Clock className="h-4 w-4 text-zinc-900 dark:text-white" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Study Targets & Timezone
            </h2>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Daily Study Goal
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
              {STUDY_GOAL_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDailyGoalMinutes(mins)}
                  className={`py-2 rounded-xl border text-xs font-medium font-mono tnum transition-all btn-press ${
                    dailyGoalMinutes === mins
                      ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Goal tracked on your Cockpit dashboard and daily study streak.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 font-mono"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Appearance & Theme */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-zinc-900 dark:text-white" />
              ) : (
                <Sun className="h-4 w-4 text-zinc-900 dark:text-white" />
              )}
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Appearance
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">
              {theme === "dark" ? "OLED Black" : "Pure White"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all btn-press ${
                theme === "light"
                  ? "border-zinc-900 bg-zinc-50 text-zinc-900 shadow-xs"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
              }`}
            >
              <div>
                <div className="text-xs font-semibold">Pure White</div>
                <div className="text-[10px] text-zinc-500">Default bright theme</div>
              </div>
              {theme === "light" && <Check className="h-4 w-4 text-zinc-900" />}
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all btn-press ${
                theme === "dark"
                  ? "border-white bg-[#09090B] text-white shadow-xs"
                  : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-700"
              }`}
            >
              <div>
                <div className="text-xs font-semibold">OLED Black</div>
                <div className="text-[10px] text-zinc-400">Pure black night theme</div>
              </div>
              {theme === "dark" && <Check className="h-4 w-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>

      {/* Section 4: Account Actions & Danger Zone */}
      <div className="p-6 rounded-2xl border border-red-200/50 dark:border-red-950/50 bg-white dark:bg-[#09090B] space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Account Management
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <p className="text-xs font-medium text-zinc-900 dark:text-white">
              Sign out of this browser
            </p>
            <p className="text-[11px] text-zinc-500">
              Clear your active session and return to the login screen.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Delete Account
            </p>
            <p className="text-[11px] text-zinc-500">
              Permanently delete all study records, flashcards, and timetable entries.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700 btn-press disabled:opacity-50"
          >
            {isDeletingAccount ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

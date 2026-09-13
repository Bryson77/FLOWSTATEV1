'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    const userTimezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'Africa/Johannesburg';

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              timezone: userTimezone,
            },
          },
        });
        if (error) throw error;
        if (data?.session) {
          router.push('/home');
        } else {
          setInfoMsg('Verification email sent. Please check your inbox.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        router.push('/home');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('Wrong email or password.');
      } else {
        setErrorMsg(msg || 'Authentication failed. Check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col justify-center items-center px-4 relative transition-colors duration-150">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo & Subtitle */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Saktus
            </span>
          </Link>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isSignUp
              ? 'Organise courses, timetable, exams & flashcards'
              : 'Sign in to access your study space'}
          </p>
        </div>

        {/* Tactile Solid Card Form (No glassmorphism) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 sm:p-8 space-y-5 shadow-sm dark:shadow-2xl transition-colors duration-150">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 space-y-2">
              <p className="font-medium">{errorMsg}</p>
              {!isSignUp && (
                <div className="pt-2 border-t border-red-200 dark:border-red-500/20 flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">New here?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg('');
                    }}
                    className="font-semibold text-zinc-900 dark:text-white underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Create an account
                  </button>
                </div>
              )}
            </div>
          )}

          {infoMsg && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-3.5 text-xs text-blue-600 dark:text-blue-300">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Ndlovu"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="student@university.ac.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-press rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black py-3 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-20 skeleton" />
              ) : (
                <>
                  <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Switch */}
          <div className="pt-2 text-center text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account yet?"} </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="font-medium text-zinc-900 dark:text-white underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

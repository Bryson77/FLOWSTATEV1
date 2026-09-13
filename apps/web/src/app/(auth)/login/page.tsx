'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, Mail, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

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

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName.trim() }
          }
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
          password
        });
        if (error) throw error;
        router.push('/home');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 selection:bg-white selection:text-black">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo & Subtitle */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="font-display text-2xl font-bold tracking-tight text-white">Saktus</span>
          </Link>
          <h2 className="text-lg font-semibold text-white tracking-tight">
            {isSignUp ? 'Create your academic cockpit' : 'Welcome back'}
          </h2>
          <p className="text-xs text-[#A0A0A0]">
            {isSignUp ? 'Organise courses, timetable, exams & active recall' : 'Enter your credentials to enter your cockpit'}
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-6 sm:p-8 space-y-5 shadow-2xl">
          {errorMsg && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-300">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lethabo Mabilo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="student@university.ac.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-press rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
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
          <div className="pt-2 text-center text-xs text-[#A0A0A0] border-t border-white/5">
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account yet?"} </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="font-medium text-white underline underline-offset-4 hover:text-zinc-300"
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

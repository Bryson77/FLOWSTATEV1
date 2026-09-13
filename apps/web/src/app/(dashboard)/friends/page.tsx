'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Zap, Trophy, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface StudyBuddy {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  isStudying: boolean;
  streak: number;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  streak: number;
  degree: string;
  isSelf?: boolean;
}

export default function FriendsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buddies, setBuddies] = useState<StudyBuddy[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [cheered, setCheered] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createClient();

  const loadSquadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // Fetch profiles to show real students / leaderboard
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, degree, current_subject, is_studying_now, study_streak_days, avatar_url')
        .order('study_streak_days', { ascending: false })
        .limit(20);

      if (profErr) {
        throw profErr;
      }

      if (profiles && profiles.length > 0) {
        // Active buddies (currently studying or recent)
        const buddyList: StudyBuddy[] = profiles.map(p => {
          const initials = p.full_name
            ? p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : 'ST';

          return {
            id: p.id,
            name: p.full_name || 'Anonymous Student',
            avatar: initials,
            subject: p.current_subject || 'General Study',
            isStudying: p.is_studying_now || false,
            streak: p.study_streak_days || 0,
          };
        });
        setBuddies(buddyList);

        // Leaderboard ranked by streak
        const lb: LeaderboardUser[] = profiles.map((p, idx) => ({
          rank: idx + 1,
          name: p.id === user.id ? `You (${p.full_name || 'Me'})` : (p.full_name || 'Student'),
          streak: p.study_streak_days || 0,
          degree: p.degree || 'Degree Program',
          isSelf: p.id === user.id,
        }));
        setLeaderboard(lb);
      } else {
        setBuddies([]);
        setLeaderboard([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load study squad. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSquadData();
  }, []);

  const handleCheer = (id: string, text: string) => {
    setCheered(prev => ({ ...prev, [id]: text }));
    setTimeout(() => {
      setCheered(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Squad & Campus</h1>
          <p className="mt-1 text-[#A0A0A0]">Real-time study presence and verified streak leaderboards.</p>
        </div>
        <button
          onClick={loadSquadData}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-xs font-mono text-[#A0A0A0] hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <span className="flex-1">{error}</span>
          <button onClick={loadSquadData} className="font-mono text-xs text-red-300 underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Live Now Study Group */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-4">
          Campus Presence (Active Students)
        </h3>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 bg-[#111111] border border-[#2A2A2A] animate-pulse rounded-2xl" />
            <div className="h-20 bg-[#111111] border border-[#2A2A2A] animate-pulse rounded-2xl" />
          </div>
        ) : buddies.length === 0 ? (
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-8 text-center">
            <Users className="h-8 w-8 text-[#A0A0A0] mx-auto mb-2" />
            <h4 className="font-display text-base font-semibold text-white">No squad members yet</h4>
            <p className="text-xs text-[#A0A0A0] mt-1 max-w-sm mx-auto">
              As other students join and study with Saktus, their live presence and streaks will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {buddies.map(friend => (
              <div
                key={friend.id}
                className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-5 flex items-center justify-between transition-all hover:border-[#3A3A3A]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center font-semibold text-xs text-white">
                      {friend.avatar}
                    </div>
                    {friend.isStudying && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-black" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{friend.name}</h4>
                    <p className="text-xs text-zinc-400">
                      {friend.isStudying ? (
                        <span className="text-[#22C55E]">Studying · {friend.subject}</span>
                      ) : (
                        `Streak: ${friend.streak} day(s)`
                      )}
                    </p>
                  </div>
                </div>

                {/* Cheer button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCheer(friend.id, '✓ Sent')}
                    className="rounded-full border border-[#2A2A2A] bg-[#1a1a1a] p-2 text-zinc-400 hover:text-white hover:border-[#4A4A4A] transition-all active:scale-95"
                    title="Send Quick Cheer"
                  >
                    {cheered[friend.id] ? (
                      <span className="text-[10px] font-bold text-[#22C55E] px-1">Sent</span>
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Campus / Squad Leaderboard */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-lg font-semibold text-white">Streak Leaderboard</h3>
          </div>
          <span className="text-xs text-[#A0A0A0] font-mono">Live Supabase Sync</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-10 bg-[#1a1a1a] animate-pulse rounded" />
            <div className="h-10 bg-[#1a1a1a] animate-pulse rounded" />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-xs text-[#A0A0A0] text-center py-4">No streak records yet.</p>
        ) : (
          <div className="divide-y divide-[#222222]">
            {leaderboard.map(user => (
              <div
                key={user.rank}
                className={`flex items-center justify-between py-3 px-3 rounded-lg ${
                  user.isSelf ? 'bg-white/5 font-semibold' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-[#A0A0A0] w-6">{user.rank}.</span>
                  <div>
                    <span className="text-sm text-white">{user.name}</span>
                    <span className="block text-[10px] text-zinc-500">{user.degree}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-white">{user.streak} days</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


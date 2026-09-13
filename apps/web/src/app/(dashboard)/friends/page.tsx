'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Zap,
  Trophy,
  Flame,
  Radio,
  Plus,
  Search,
  Check,
  Copy,
  Clock,
  KeyRound,
  ArrowRight,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

interface StudentProfile {
  id: string;
  name: string;
  username: string | null;
  degree: string | null;
  streak: number;
  isStudying: boolean;
  currentSubject: string | null;
  isFollowing: boolean;
  isMutual: boolean;
  lastActive: string | null;
}

interface StudyRoomItem {
  id: string;
  host_id: string;
  host_name?: string;
  name: string;
  code: string;
  duration_seconds: number;
  elapsed_seconds_at_pause: number;
  status: 'active' | 'paused' | 'completed';
  last_resumed_at: string | null;
  member_count?: number;
}

export default function FriendsDashboardPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Search
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDuration, setRoomDuration] = useState(25);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Join by code
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);

  // Active Joined Room
  const [joinedRoom, setJoinedRoom] = useState<StudyRoomItem | null>(null);
  const [roomTimeRemaining, setRoomTimeRemaining] = useState(25 * 60);
  const [cheeredMap, setCheeredMap] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Parallel fetch: current user profile, all profiles, follows, active study rooms
      const [userProfileRes, profilesRes, followsRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('*').neq('id', user.id).limit(50),
        supabase.from('follows').select('*'),
        supabase
          .from('study_rooms')
          .select('*, profiles:host_id(full_name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      ]);

      const follows = followsRes.data || [];
      const followingIds = new Set(follows.filter((f: any) => f.follower_id === user.id).map((f: any) => f.followee_id));
      const followerIds = new Set(follows.filter((f: any) => f.followee_id === user.id).map((f: any) => f.follower_id));

      if (userProfileRes.data) {
        const u = userProfileRes.data;
        setCurrentUserProfile({
          id: u.id,
          name: u.full_name || 'You',
          username: u.username,
          degree: u.degree,
          streak: u.study_streak_days || 0,
          isStudying: u.is_studying_now || false,
          currentSubject: u.current_subject,
          isFollowing: false,
          isMutual: false,
          lastActive: u.last_study_date
        });
      }

      const mappedStudents: StudentProfile[] = (profilesRes.data || []).map((p: any) => {
        const isFollowing = followingIds.has(p.id);
        const isFollower = followerIds.has(p.id);
        return {
          id: p.id,
          name: p.full_name || 'Student',
          username: p.username,
          degree: p.degree,
          streak: p.study_streak_days || 0,
          isStudying: p.is_studying_now || false,
          currentSubject: p.current_subject,
          isFollowing,
          isMutual: isFollowing && isFollower,
          lastActive: p.last_study_date
        };
      });

      setStudents(mappedStudents);

      const mappedRooms: StudyRoomItem[] = (roomsRes.data || []).map((r: any) => ({
        id: r.id,
        host_id: r.host_id,
        host_name: r.profiles?.full_name || 'Squad Host',
        name: r.name,
        code: r.code,
        duration_seconds: r.duration_seconds || 1500,
        elapsed_seconds_at_pause: r.elapsed_seconds_at_pause || 0,
        status: r.status,
        last_resumed_at: r.last_resumed_at
      }));

      setStudyRooms(mappedRooms);
    } catch {
      toast('Failed to load social and study room data', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active room timer countdown tick
  useEffect(() => {
    if (!joinedRoom || joinedRoom.status !== 'active') return;

    const interval = setInterval(() => {
      setRoomTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          toast(`Study room "${joinedRoom.name}" session complete!`, 'success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [joinedRoom, toast]);

  // Follow / Unfollow
  const handleToggleFollow = async (student: StudentProfile) => {
    if (!currentUserId) return;

    if (student.isFollowing) {
      setStudents(prev =>
        prev.map(s => (s.id === student.id ? { ...s, isFollowing: false, isMutual: false } : s))
      );
      try {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', student.id);
        toast(`Unfollowed ${student.name}`, 'info');
      } catch {
        toast('Failed to unfollow', 'error');
        loadData();
      }
    } else {
      setStudents(prev =>
        prev.map(s => (s.id === student.id ? { ...s, isFollowing: true } : s))
      );
      try {
        await supabase.from('follows').insert({
          follower_id: currentUserId,
          followee_id: student.id
        });
        toast(`Now following ${student.name}`, 'success');
      } catch {
        toast('Failed to follow', 'error');
        loadData();
      }
    }
  };

  // Launch Study Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !currentUserId) return;

    setIsCreatingRoom(true);
    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const durationSec = roomDuration * 60;

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          host_id: currentUserId,
          name: roomName.trim(),
          code: roomCode,
          duration_seconds: durationSec,
          elapsed_seconds_at_pause: 0,
          status: 'active',
          last_resumed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('study_room_members').insert({
        room_id: data.id,
        user_id: currentUserId
      });

      setIsRoomModalOpen(false);
      setRoomName('');
      toast('Study room launched', 'success');

      setJoinedRoom({
        id: data.id,
        host_id: data.host_id,
        host_name: 'You',
        name: data.name,
        code: data.code,
        duration_seconds: durationSec,
        elapsed_seconds_at_pause: 0,
        status: 'active',
        last_resumed_at: data.last_resumed_at
      });
      setRoomTimeRemaining(durationSec);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to create room', 'error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join existing room
  const handleJoinRoom = async (room: StudyRoomItem) => {
    if (!currentUserId) return;
    try {
      await supabase.from('study_room_members').upsert({
        room_id: room.id,
        user_id: currentUserId
      });

      setJoinedRoom(room);
      if (room.last_resumed_at && room.status === 'active') {
        const elapsedSinceResume = Math.floor(
          (Date.now() - new Date(room.last_resumed_at).getTime()) / 1000
        );
        const rem = Math.max(0, room.duration_seconds - room.elapsed_seconds_at_pause - elapsedSinceResume);
        setRoomTimeRemaining(rem);
      } else {
        setRoomTimeRemaining(room.duration_seconds - room.elapsed_seconds_at_pause);
      }
      toast(`Joined ${room.name}`, 'success');
    } catch {
      toast('Failed to join study room', 'error');
    }
  };

  // Join by 6-char squad code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length !== 6 || !currentUserId) {
      toast('Please enter a valid 6-character room code', 'error');
      return;
    }

    setIsJoiningWithCode(true);
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*, profiles:host_id(full_name)')
        .eq('code', code)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        toast('No active room found with code ' + code, 'error');
        return;
      }

      await supabase.from('study_room_members').upsert({
        room_id: data.id,
        user_id: currentUserId
      });

      const matchedRoom: StudyRoomItem = {
        id: data.id,
        host_id: data.host_id,
        host_name: data.profiles?.full_name || 'Squad Host',
        name: data.name,
        code: data.code,
        duration_seconds: data.duration_seconds || 1500,
        elapsed_seconds_at_pause: data.elapsed_seconds_at_pause || 0,
        status: data.status,
        last_resumed_at: data.last_resumed_at
      };

      setJoinedRoom(matchedRoom);
      setRoomTimeRemaining(matchedRoom.duration_seconds - matchedRoom.elapsed_seconds_at_pause);
      setIsJoinCodeModalOpen(false);
      setJoinCodeInput('');
      toast(`Joined room ${matchedRoom.name}!`, 'success');
      loadData();
    } catch {
      toast('Failed to join room', 'error');
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  // Send study cheer
  const handleSendCheer = (studentId: string) => {
    setCheeredMap(prev => ({ ...prev, [studentId]: 'Locked In' }));
    toast('Sent study cheer', 'success');
    setTimeout(() => {
      setCheeredMap(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }, 4000);
  };

  // Filtered lists
  const followedFriends = students.filter(s => s.isFollowing);

  // Scoped Leaderboard: Followed friends + Current User, ranked by streak
  const leaderboardEntries = [
    ...(currentUserProfile ? [currentUserProfile] : []),
    ...followedFriends
  ].sort((a, b) => b.streak - a.streak);

  // Search filter for modal
  const filteredSearchStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.degree && s.degree.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-200 pb-20">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Friends
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Study with friends, track streaks, and see who's online.
          </p>
        </div>

        {/* Top Right: Follow Friends button */}
        <button
          onClick={() => setIsFollowModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all btn-press shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Follow Friends</span>
        </button>
      </div>

      {/* Active Joined Room HUD Banner (Shown if user is currently inside a room) */}
      {joinedRoom && (
        <div className="rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-6 shadow-sm dark:shadow-2xl space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                Active Room: {joinedRoom.name}
              </span>
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-white/[0.06] px-2 py-0.5 rounded">
                Code: {joinedRoom.code}
              </span>
            </div>
            <button
              onClick={() => setJoinedRoom(null)}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Leave Room
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-mono text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white tnum">
                {Math.floor(roomTimeRemaining / 60).toString().padStart(2, '0')}:
                {(roomTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Host: {joinedRoom.host_name}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined') {
                    navigator.clipboard?.writeText(joinedRoom.code);
                    toast('Room code copied to clipboard', 'success');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3.5 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Study Rooms Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Study Rooms</h2>
          </div>

          {/* Primary CTA inline with section title */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsJoinCodeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white btn-press"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Join with Code</span>
            </button>

            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-3.5 py-1.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all btn-press shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Launch Study Room</span>
            </button>
          </div>
        </div>

        {/* Live Rooms List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studyRooms.length === 0 ? (
            <div className="col-span-full text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-2 bg-white dark:bg-[#09090b]">
              <Radio className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No active rooms found</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Launch a room above or join with a 6-character squad code.
              </p>
            </div>
          ) : (
            studyRooms.map(room => (
              <div
                key={room.id}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-4 flex flex-col justify-between shadow-sm transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.04] px-2 py-0.5 rounded">
                      Host: {room.host_name}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                    {room.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Interval: {Math.floor(room.duration_seconds / 60)} minutes · Code: {room.code}
                  </p>
                </div>

                <button
                  onClick={() => handleJoinRoom(room)}
                  className="w-full rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black py-2.5 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all btn-press"
                >
                  Join Study Room
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 3. Friends Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Friends</h2>
            <span className="text-xs font-mono text-zinc-500">({followedFriends.length})</span>
          </div>

          <button
            onClick={() => setIsFollowModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <span>Find more students</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {followedFriends.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-3 bg-white dark:bg-[#09090b]">
            <Users className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              You're not following anyone yet
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Tap Follow Friends to find students, compare streaks, and study together.
            </p>
            <button
              onClick={() => setIsFollowModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all btn-press shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Follow Friends</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followedFriends.map(friend => (
              <div
                key={friend.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between gap-4 shadow-sm transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {friend.name}
                    </span>
                    {friend.username && (
                      <span className="text-[11px] font-mono text-zinc-400 truncate">
                        @{friend.username}
                      </span>
                    )}
                    {friend.isMutual && (
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
                        Mutual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                      <Flame className="h-3 w-3" />
                      <span>{friend.streak}d streak</span>
                    </span>
                    <span>·</span>
                    {friend.isStudying ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Studying Now
                      </span>
                    ) : (
                      <span>Last active {friend.lastActive || 'recently'}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {friend.isStudying && (
                    <button
                      onClick={() => handleSendCheer(friend.id)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white btn-press"
                      title="Send Cheer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleFollow(friend)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press"
                  >
                    Following
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Leaderboard Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Leaderboard</h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">Scoped to friends & squads</span>
        </div>

        {leaderboardEntries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-2 bg-white dark:bg-[#09090b]">
            <Trophy className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No leaderboard data yet</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Follow friends or join a squad to compare streaks.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-4 sm:p-6 space-y-2 shadow-sm transition-colors">
            {leaderboardEntries.map((student, idx) => {
              const isSelf = student.id === currentUserId;
              return (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    isSelf
                      ? 'bg-zinc-100 dark:bg-white/[0.06] border border-zinc-300 dark:border-zinc-700'
                      : 'border border-zinc-100 dark:border-white/[0.03] hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 font-mono text-xs font-bold text-center ${
                        idx === 0
                          ? 'text-amber-500'
                          : idx === 1
                          ? 'text-zinc-400'
                          : idx === 2
                          ? 'text-amber-700 dark:text-amber-600'
                          : 'text-zinc-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                        <span>{student.name}</span>
                        {isSelf && (
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-white/10 px-1.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">
                        {student.degree || 'Student'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                    <Flame className="h-3.5 w-3.5" />
                    <span className="tnum">{student.streak} Days</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Follow Friends Search Modal */}
      {isFollowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Follow Students</h3>
                <p className="text-xs text-zinc-500">Discover peers and study buddies</p>
              </div>
              <button
                onClick={() => setIsFollowModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search students by name or @username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredSearchStudents.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">No students match your query.</div>
              ) : (
                filteredSearchStudents.map(student => (
                  <div
                    key={student.id}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {student.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">
                        {student.username ? `@${student.username} · ` : ''}
                        {student.degree || 'Student'} · {student.streak}d streak
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFollow(student)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press shrink-0 ${
                        student.isFollowing
                          ? 'border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                          : 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      }`}
                    >
                      {student.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Launch Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Launch Study Room</h3>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Res Squad"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  Duration
                </label>
                <select
                  value={roomDuration}
                  onChange={e => setRoomDuration(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value={25}>25 Minutes (Standard Pomodoro)</option>
                  <option value={50}>50 Minutes (Extended Deep Work)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all btn-press disabled:opacity-50"
                >
                  {isCreatingRoom ? 'Launching...' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join with Squad Code Modal */}
      {isJoinCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Join with Room Code</h3>
              <button onClick={() => setIsJoinCodeModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  6-Character Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. A9B2X7"
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinCodeModalOpen(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoiningWithCode || joinCodeInput.trim().length !== 6}
                  className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all btn-press disabled:opacity-50"
                >
                  {isJoiningWithCode ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

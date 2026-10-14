'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Zap,
  Flame,
  Coffee,
  ThumbsUp,
  Trophy,
  Radio,
  Plus,
  Search,
  Check,
  Copy,
  Clock,
  KeyRound,
  ArrowRight,
  X,
  Play,
  Pause,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { getSafeErrorMessage } from '@/lib/errors';
import {
  createRoomSchema,
  joinRoomSchema,
  validateWithZod,
  calculateRemainingSeconds,
  type StudyRoomClockState,
  type CheerIconType,
  type RoomCheerPayload,
  type RoomPresenceState,
} from '@saktus/shared';
import { PresenceAvatarStack, type AvatarItem } from '@/components/social/presence-avatar-stack';
import { StudyRoomCard } from '@/components/social/study-room-card';
import { SegmentedControl } from '@/components/social/segmented-control';
import { CheerReactionBar, CHEER_CONFIG } from '@/components/social/cheer-reaction-bar';

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
  avatarUrl?: string | null;
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

interface ActiveCheerBubble {
  id: string;
  icon: CheerIconType;
  sender_name: string;
}

type TabFilter = 'all' | 'mutual' | 'sprints';

export default function FriendsDashboardPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter Segmented Control
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

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
  const [roomPresenceMembers, setRoomPresenceMembers] = useState<AvatarItem[]>([]);
  const [floatingCheers, setFloatingCheers] = useState<ActiveCheerBubble[]>([]);

  const channelRef = useRef<any>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Load Initial Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [userProfileRes, profilesRes, followsRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, university, degree, study_streak_days, is_studying_now, current_subject, last_study_date')
          .neq('id', user.id)
          .limit(50),
        supabase.from('follows').select('*'),
        supabase
          .from('study_rooms')
          .select('*, profiles:host_id(full_name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ]);

      const follows = followsRes.data || [];
      const followingIds = new Set(
        follows.filter((f: any) => f.follower_id === user.id).map((f: any) => f.followee_id)
      );
      const followerIds = new Set(
        follows.filter((f: any) => f.followee_id === user.id).map((f: any) => f.follower_id)
      );

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
          lastActive: u.last_study_date,
          avatarUrl: u.avatar_url,
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
          lastActive: p.last_study_date,
          avatarUrl: p.avatar_url,
        };
      });

      setStudents(mappedStudents);

      const mappedRooms: StudyRoomItem[] = (roomsRes.data || []).map((r: any) => ({
        id: r.id,
        host_id: r.host_id,
        host_name: r.profiles?.full_name || 'Host',
        name: r.name,
        code: r.code,
        duration_seconds: r.duration_seconds || 1500,
        elapsed_seconds_at_pause: r.elapsed_seconds_at_pause || 0,
        status: (r.status as 'active' | 'paused' | 'completed') || 'active',
        last_resumed_at: r.last_resumed_at,
      }));

      setStudyRooms(mappedRooms);
    } catch (err: any) {
      console.error('Friends load error:', err);
      toast(getSafeErrorMessage(err, 'Failed to load social and study room data. Something went wrong.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Delta-Resilient Clock Countdown Loop
  useEffect(() => {
    if (!joinedRoom) return;

    const tick = () => {
      const state: StudyRoomClockState = {
        durationSeconds: joinedRoom.duration_seconds,
        elapsedSecondsAtPause: joinedRoom.elapsed_seconds_at_pause,
        lastResumedAt: joinedRoom.last_resumed_at,
        status: joinedRoom.status,
      };

      const remaining = calculateRemainingSeconds(state);
      setRoomTimeRemaining(remaining);

      if (remaining === 0 && joinedRoom.status === 'active') {
        toast('Focus sprint complete. 25 minutes logged to your course total. Take a 5-minute break.', 'success');
        setJoinedRoom((prev) => (prev ? { ...prev, status: 'completed' } : null));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [joinedRoom, toast]);

  // Supabase Realtime Broadcast & Presence Channel
  useEffect(() => {
    if (!joinedRoom || !currentUserId) return;

    const channelName = `study_room:${joinedRoom.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId },
      },
    });

    channelRef.current = channel;

    // Listen for room start / resume broadcast
    channel.on('broadcast', { event: 'room_start' }, ({ payload }: { payload: { last_resumed_at: string } }) => {
      setJoinedRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'active',
              last_resumed_at: payload.last_resumed_at,
            }
          : null
      );
    });

    // Listen for room pause broadcast
    channel.on('broadcast', { event: 'room_pause' }, ({ payload }: { payload: { elapsed_seconds: number } }) => {
      setJoinedRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'paused',
              elapsed_seconds_at_pause: payload.elapsed_seconds,
              last_resumed_at: null,
            }
          : null
      );
    });

    // Listen for zero-DB haptic cheers
    channel.on('broadcast', { event: 'cheer' }, ({ payload }: { payload: RoomCheerPayload }) => {
      const cheerId = `${payload.sender_id}-${Date.now()}`;
      setFloatingCheers((prev) => [
        ...prev,
        { id: cheerId, icon: payload.icon, sender_name: payload.sender_name },
      ]);

      // Micro-toast notification
      toast(`Cheered by ${payload.sender_name} with ${CHEER_CONFIG[payload.icon].label}.`, 'info');

      // Auto-cleanup floating pill after 1.2s
      setTimeout(() => {
        setFloatingCheers((prev) => prev.filter((c) => c.id !== cheerId));
      }, 1200);
    });

    // Presence sync: participant list
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState<RoomPresenceState>();
      const members: AvatarItem[] = [];

      Object.values(presenceState).forEach((presences) => {
        presences.forEach((p) => {
          members.push({
            id: p.user_id,
            name: p.name,
            avatarUrl: p.avatar_url,
            isStudying: p.is_studying ?? true,
            subject: p.subject,
          });
        });
      });

      setRoomPresenceMembers(members);
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: currentUserId,
          name: currentUserProfile?.name || 'Student',
          avatar_url: currentUserProfile?.avatarUrl,
          is_studying: true,
          subject: currentUserProfile?.currentSubject,
        });
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [joinedRoom?.id, currentUserId, currentUserProfile, supabase, toast]);

  // Send Haptic Cheer
  const handleSendCheer = async (icon: CheerIconType) => {
    if (!channelRef.current || !currentUserId || !currentUserProfile) return;

    const payload: RoomCheerPayload = {
      icon,
      sender_name: currentUserProfile.name,
      sender_id: currentUserId,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to room members without hitting database
    await channelRef.current.send({
      type: 'broadcast',
      event: 'cheer',
      payload,
    });

    // Show local sensory pill immediately
    const cheerId = `self-${Date.now()}`;
    setFloatingCheers((prev) => [...prev, { id: cheerId, icon, sender_name: 'You' }]);
    setTimeout(() => {
      setFloatingCheers((prev) => prev.filter((c) => c.id !== cheerId));
    }, 1200);

    toast(`Cheered with ${CHEER_CONFIG[icon].label}.`, 'success');
  };

  // Host Action: Pause / Resume Sprint
  const handleToggleSprintTimer = async () => {
    if (!joinedRoom || joinedRoom.host_id !== currentUserId) return;

    const isPausing = joinedRoom.status === 'active';

    if (isPausing) {
      const state: StudyRoomClockState = {
        durationSeconds: joinedRoom.duration_seconds,
        elapsedSecondsAtPause: joinedRoom.elapsed_seconds_at_pause,
        lastResumedAt: joinedRoom.last_resumed_at,
        status: 'active',
      };
      const nowMs = Date.now();
      const resumedMs = joinedRoom.last_resumed_at ? new Date(joinedRoom.last_resumed_at).getTime() : nowMs;
      const currentRunSeconds = Math.max(0, Math.floor((nowMs - resumedMs) / 1000));
      const newElapsed = joinedRoom.elapsed_seconds_at_pause + currentRunSeconds;

      setJoinedRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'paused',
              elapsed_seconds_at_pause: newElapsed,
              last_resumed_at: null,
            }
          : null
      );

      await supabase
        .from('study_rooms')
        .update({
          status: 'paused',
          elapsed_seconds_at_pause: newElapsed,
          last_resumed_at: null,
        })
        .eq('id', joinedRoom.id);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'room_pause',
          payload: { elapsed_seconds: newElapsed },
        });
      }
      toast('Sprint paused', 'info');
    } else {
      const nowIso = new Date().toISOString();
      setJoinedRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'active',
              last_resumed_at: nowIso,
            }
          : null
      );

      await supabase
        .from('study_rooms')
        .update({
          status: 'active',
          last_resumed_at: nowIso,
        })
        .eq('id', joinedRoom.id);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'room_start',
          payload: { last_resumed_at: nowIso },
        });
      }
      toast('Sprint resumed', 'success');
    }
  };

  // Follow / Unfollow
  const handleToggleFollow = async (student: StudentProfile) => {
    if (!currentUserId) return;

    if (student.isFollowing) {
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isFollowing: false, isMutual: false } : s))
      );
      try {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', student.id);
        toast(`Unfollowed ${student.name}`, 'info');
      } catch (err: any) {
        console.error('Unfollow error:', err);
        toast('Failed to unfollow. Something went wrong.', 'error');
        loadData();
      }
    } else {
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isFollowing: true } : s))
      );
      try {
        await supabase.from('follows').insert({
          follower_id: currentUserId,
          followee_id: student.id,
        });
        toast(`Now following ${student.name}`, 'success');
      } catch (err: any) {
        console.error('Follow error:', err);
        toast('Failed to follow. Something went wrong.', 'error');
        loadData();
      }
    }
  };

  // Launch Study Sprint
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateWithZod(createRoomSchema, {
      name: roomName,
      durationMinutes: roomDuration,
    });

    if (!validation.success) {
      toast(validation.error, 'error');
      return;
    }
    if (!currentUserId) return;

    setIsCreatingRoom(true);
    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const durationSec = roomDuration * 60;
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          host_id: currentUserId,
          name: roomName.trim(),
          code: roomCode,
          duration_seconds: durationSec,
          elapsed_seconds_at_pause: 0,
          status: 'active',
          last_resumed_at: nowIso,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('study_room_members').insert({
        room_id: data.id,
        user_id: currentUserId,
      });

      setIsRoomModalOpen(false);
      setRoomName('');
      toast('Focus sprint launched', 'success');

      setJoinedRoom({
        id: data.id,
        host_id: data.host_id,
        host_name: 'You',
        name: data.name,
        code: data.code,
        duration_seconds: durationSec,
        elapsed_seconds_at_pause: 0,
        status: 'active',
        last_resumed_at: nowIso,
      });
      setRoomTimeRemaining(durationSec);
      loadData();
    } catch (err: any) {
      console.error('Create room error:', err);
      toast(getSafeErrorMessage(err, 'Failed to create room. Something went wrong.'), 'error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join Room
  const handleJoinRoom = async (room: StudyRoomItem) => {
    if (!currentUserId) return;
    try {
      await supabase.from('study_room_members').upsert({
        room_id: room.id,
        user_id: currentUserId,
      });

      setJoinedRoom(room);
      const remaining = calculateRemainingSeconds({
        durationSeconds: room.duration_seconds,
        elapsedSecondsAtPause: room.elapsed_seconds_at_pause,
        lastResumedAt: room.last_resumed_at,
        status: room.status,
      });
      setRoomTimeRemaining(remaining);
      toast(`Joined ${room.name}`, 'success');
    } catch (err: any) {
      console.error('Join room error:', err);
      toast('Failed to join study room. Something went wrong.', 'error');
    }
  };

  // Join by 6-char code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateWithZod(joinRoomSchema, { code: joinCodeInput });
    if (!validation.success) {
      toast(validation.error, 'error');
      return;
    }
    if (!currentUserId) return;

    const code = validation.data.code.toUpperCase();
    setIsJoiningWithCode(true);
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*, profiles:host_id(full_name)')
        .eq('code', code)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        toast(`No active sprint found with code ${code}.`, 'error');
        return;
      }

      await supabase.from('study_room_members').upsert({
        room_id: data.id,
        user_id: currentUserId,
      });

      const matchedRoom: StudyRoomItem = {
        id: data.id,
        host_id: data.host_id,
        host_name: data.profiles?.full_name || 'Host',
        name: data.name,
        code: data.code,
        duration_seconds: data.duration_seconds || 1500,
        elapsed_seconds_at_pause: data.elapsed_seconds_at_pause || 0,
        status: (data.status as 'active' | 'paused' | 'completed') || 'active',
        last_resumed_at: data.last_resumed_at,
      };

      setJoinedRoom(matchedRoom);
      setRoomTimeRemaining(
        calculateRemainingSeconds({
          durationSeconds: matchedRoom.duration_seconds,
          elapsedSecondsAtPause: matchedRoom.elapsed_seconds_at_pause,
          lastResumedAt: matchedRoom.last_resumed_at,
          status: matchedRoom.status,
        })
      );
      setIsJoinCodeModalOpen(false);
      setJoinCodeInput('');
      toast(`Joined sprint ${matchedRoom.name}`, 'success');
      loadData();
    } catch (err: any) {
      console.error('Join by code error:', err);
      toast(getSafeErrorMessage(err, 'Failed to join room. Something went wrong.'), 'error');
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  // Filters
  const followedFriends = students.filter((s) => s.isFollowing);
  const mutualFriends = students.filter((s) => s.isMutual);

  // Leaderboard entries
  const leaderboardEntries = [
    ...(currentUserProfile ? [currentUserProfile] : []),
    ...followedFriends,
  ].sort((a, b) => b.streak - a.streak);

  // Filtered students based on search modal
  const filteredSearchStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.degree && s.degree.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-20">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Social Study
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Co-working sprints and mutual peer accountability. Zero distractions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsJoinCodeModalOpen(true)}
            className="btn-press inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Join by Code</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRoomModalOpen(true)}
            className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-black dark:hover:bg-zinc-100 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Sprint</span>
          </button>
        </div>
      </div>

      {/* Active Joined Sprint HUD (Section 4.2 & 4.4) */}
      {joinedRoom && (
        <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 shadow-xs space-y-5 transition-colors overflow-hidden">
          {/* Floating Haptic Cheer Overlays */}
          <div className="absolute top-4 right-6 pointer-events-none flex flex-col gap-2 z-20">
            {floatingCheers.map((cheer) => {
              const Icon = CHEER_CONFIG[cheer.icon].icon;
              return (
                <div
                  key={cheer.id}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-300 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black text-xs font-semibold shadow-lg"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cheer.sender_name} cheered!</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                Live Sprint: {joinedRoom.name}
              </span>
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded tnum">
                Code: {joinedRoom.code}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(joinedRoom.code);
                  toast('Sprint code copied', 'success');
                }}
                className="btn-press text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                <span>Copy Code</span>
              </button>

              <button
                type="button"
                onClick={() => setJoinedRoom(null)}
                className="btn-press text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>Leave Sprint</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white tnum tracking-tight">
                {Math.floor(roomTimeRemaining / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(roomTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Host: {joinedRoom.host_name} · Status:{' '}
                <span className="font-semibold capitalize text-zinc-900 dark:text-white">
                  {joinedRoom.status}
                </span>
              </p>
            </div>

            {/* Room Presence Stack & Zero-Chat Cheers */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Studying Now
                </span>
                <PresenceAvatarStack members={roomPresenceMembers} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Cheer Sprint
                </span>
                <CheerReactionBar onCheer={handleSendCheer} />
              </div>

              {joinedRoom.host_id === currentUserId && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Host Control
                  </span>
                  <div>
                    <button
                      type="button"
                      onClick={handleToggleSprintTimer}
                      className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white cursor-pointer"
                    >
                      {joinedRoom.status === 'active' ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Sprint</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume Sprint</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Segmented Filter Control (Section 5.2 Apple HIG) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <SegmentedControl<TabFilter>
          selected={activeTab}
          onChange={setActiveTab}
          options={[
            { id: 'all', label: 'All Students', count: students.length },
            { id: 'mutual', label: 'Mutual Friends', count: mutualFriends.length },
            { id: 'sprints', label: 'Active Sprints', count: studyRooms.length },
          ]}
        />

        <button
          type="button"
          onClick={() => setIsFollowModalOpen(true)}
          className="btn-press inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Find Classmates</span>
        </button>
      </div>

      {/* 2. Active Sprints Section */}
      {(activeTab === 'all' || activeTab === 'sprints') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Active Sprints</h2>
              <span className="text-xs font-mono text-zinc-500 tnum">({studyRooms.length})</span>
            </div>
          </div>

          {studyRooms.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-2 bg-white dark:bg-[#09090B]">
              <Radio className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">No active study sprints.</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Start a synchronized sprint or share a 6-digit room code with classmates.
              </p>
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(true)}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-black dark:hover:bg-zinc-100 cursor-pointer shadow-xs mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Sprint</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studyRooms.map((room) => (
                <StudyRoomCard
                  key={room.id}
                  name={room.name}
                  hostName={room.host_name || 'Host'}
                  durationMinutes={Math.floor(room.duration_seconds / 60)}
                  activeCount={room.member_count || 1}
                  onJoin={() => handleJoinRoom(room)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Classmates & Friends Section */}
      {(activeTab === 'all' || activeTab === 'mutual') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {activeTab === 'mutual' ? 'Mutual Friends' : 'Classmates'}
              </h2>
              <span className="text-xs font-mono text-zinc-500 tnum">
                ({activeTab === 'mutual' ? mutualFriends.length : followedFriends.length})
              </span>
            </div>
          </div>

          {(activeTab === 'mutual' ? mutualFriends : followedFriends).length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-3 bg-white dark:bg-[#09090B]">
              <Users className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">No students followed yet.</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Follow classmates from your course to view their active study sessions and join co-working sprints.
              </p>
              <button
                type="button"
                onClick={() => setIsFollowModalOpen(true)}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-black dark:hover:bg-zinc-100 cursor-pointer shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Find Classmates</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeTab === 'mutual' ? mutualFriends : followedFriends).map((friend) => (
                <div
                  key={friend.id}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] flex items-center justify-between gap-4 shadow-xs transition-colors"
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
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.2 rounded">
                          Mutual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <Flame className="h-3 w-3" />
                        <span className="tnum">{friend.streak}d streak</span>
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
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(friend)}
                      className="btn-press px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Following
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Leaderboard Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Streak Leaderboard</h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">Mutuals & followed classmates</span>
        </div>

        {leaderboardEntries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-2 bg-white dark:bg-[#09090B]">
            <Trophy className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">No leaderboard data yet.</p>
            <p className="text-xs text-zinc-500">
              Follow classmates to compare study streaks and stay accountable.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-4 sm:p-5 space-y-1.5 shadow-xs transition-colors">
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
                      className={`w-5 font-mono text-xs font-bold text-center tnum ${
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
                        {student.isMutual && !isSelf && (
                          <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                            Mutual
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

      {/* Find Classmates Search Modal */}
      {isFollowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Find Classmates</h3>
                <p className="text-xs text-zinc-500">Discover peers and study partners</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFollowModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredSearchStudents.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">No students match your query.</div>
              ) : (
                filteredSearchStudents.map((student) => (
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
                        {student.degree || 'Student'} · <span className="tnum">{student.streak}d streak</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFollow(student)}
                      className={`btn-press px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        student.isFollowing
                          ? 'border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                          : 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-black dark:hover:bg-zinc-100'
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

      {/* Launch Sprint Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create Study Sprint</h3>
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  Sprint Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discrete Math Problem Set"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
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
                  onChange={(e) => setRoomDuration(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value={25}>25 Minutes (Standard Pomodoro)</option>
                  <option value={45}>45 Minutes (Deep Focus Sprint)</option>
                  <option value={60}>60 Minutes (Extended Block)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="btn-press rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="btn-press rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-black dark:hover:bg-zinc-100 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isCreatingRoom ? 'Launching...' : 'Start Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join with Sprint Code Modal (Section 6 Micro-Copy Matrix) */}
      {isJoinCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Join with Room Code</h3>
              <button
                type="button"
                onClick={() => setIsJoinCodeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  Enter 6-digit sprint code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 849-201"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 tnum"
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Room codes are shared directly by the sprint host.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinCodeModalOpen(false)}
                  className="btn-press rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoiningWithCode || joinCodeInput.trim().length !== 6}
                  className="btn-press rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-black dark:hover:bg-zinc-100 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isJoiningWithCode ? 'Joining...' : 'Join Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

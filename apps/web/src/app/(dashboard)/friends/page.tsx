'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Zap,
  Trophy,
  Flame,
  Radio,
  Play,
  Pause,
  Clock,
  Plus,
  Search,
  Check,
  Coffee,
  Share2,
  Copy,
  AlertCircle
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

export default function FriendsAndRoomsPage() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'network' | 'leaderboard'>('rooms');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cheeredMap, setCheeredMap] = useState<Record<string, string>>({});

  // Create Room Modal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDuration, setRoomDuration] = useState(25);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Active Joined Room
  const [joinedRoom, setJoinedRoom] = useState<StudyRoomItem | null>(null);
  const [roomTimeRemaining, setRoomTimeRemaining] = useState(25 * 60);

  const { toast } = useToast();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Parallel fetch: profiles, follows, active rooms
      const [profilesRes, followsRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', user.id).limit(30),
        supabase.from('follows').select('*'),
        supabase.from('study_rooms').select('*, profiles:host_id(full_name)').eq('status', 'active').order('created_at', { ascending: false })
      ]);

      const follows = followsRes.data || [];
      const followingIds = new Set(follows.filter(f => f.follower_id === user.id).map(f => f.followee_id));
      const followerIds = new Set(follows.filter(f => f.followee_id === user.id).map(f => f.follower_id));

      const mappedStudents: StudentProfile[] = (profilesRes.data || []).map(p => {
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
          isMutual: isFollowing && isFollower
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
    } catch (err: any) {
      toast('Failed to load social and study room data', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Follow / Unfollow
  const handleToggleFollow = async (student: StudentProfile) => {
    if (!currentUserId) return;

    if (student.isFollowing) {
      // Unfollow
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isFollowing: false, isMutual: false } : s));
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
      // Follow
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isFollowing: true } : s));
      try {
        await supabase
          .from('follows')
          .insert({
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

  // Create Study Room
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

      // Add self as member
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
      // Compute remaining time delta
      if (room.last_resumed_at && room.status === 'active') {
        const elapsedSinceResume = Math.floor((Date.now() - new Date(room.last_resumed_at).getTime()) / 1000);
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

  // 1-Tap Cheer
  const handleSendCheer = (studentId: string, cheerType: string) => {
    setCheeredMap(prev => ({ ...prev, [studentId]: cheerType }));
    toast('Sent study cheer', 'success');
    setTimeout(() => {
      setCheeredMap(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }, 4000);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.degree && s.degree.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Squads & Study Rooms
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Study synchronously with friends or track campus streak leaderboards.
          </p>
        </div>

        <button
          onClick={() => setIsRoomModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
        >
          <Plus className="h-4 w-4" /> Launch Study Room
        </button>
      </div>

      {/* Active Joined Room HUD Banner (if inside room) */}
      {joinedRoom && (
        <div className="rounded-2xl border border-white/20 bg-[#09090b] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                Active Room: {joinedRoom.name}
              </span>
              <span className="text-xs font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
                Code: {joinedRoom.code}
              </span>
            </div>
            <button
              onClick={() => setJoinedRoom(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Leave Room
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-mono text-4xl sm:text-5xl font-bold text-white tnum">
                {Math.floor(roomTimeRemaining / 60).toString().padStart(2, '0')}:
                {(roomTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-zinc-400 mt-1">Host: {joinedRoom.host_name}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(joinedRoom.code);
                  toast('Room code copied to clipboard', 'success');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex rounded-xl border border-white/10 bg-[#09090b] p-1 text-xs max-w-md">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'rooms' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Live Rooms
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'network' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Follow Friends
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'leaderboard' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* Tab 1: Live Study Rooms */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studyRooms.length === 0 ? (
              <div className="col-span-full text-center py-16 border border-dashed border-white/10 rounded-2xl space-y-2">
                <Radio className="h-6 w-6 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-zinc-400">No active rooms found</p>
                <p className="text-xs text-zinc-600">Launch a room above or join with a 6-character squad code.</p>
              </div>
            ) : (
              studyRooms.map(room => (
                <div
                  key={room.id}
                  className="p-5 rounded-2xl border border-white/10 bg-[#09090b] space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded">
                        Host: {room.host_name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">{room.name}</h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      Interval: {Math.floor(room.duration_seconds / 60)} minutes
                    </p>
                  </div>

                  <button
                    onClick={() => handleJoinRoom(room)}
                    className="w-full rounded-xl bg-white py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
                  >
                    Join Study Room
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Follow Friends & Live Presence */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search students by name or @username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#09090b] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full text-center py-16 border border-dashed border-white/10 rounded-2xl text-xs text-zinc-600">
                No students match your query.
              </div>
            ) : (
              filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl border border-white/[0.08] bg-[#09090b] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{student.name}</span>
                      {student.isMutual && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                          Mutual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                      <span>{student.streak}d streak</span>
                      {student.isStudying && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400 font-medium">Studying Now</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {student.isStudying && (
                      <button
                        onClick={() => handleSendCheer(student.id, 'Locked In')}
                        className="p-2 rounded-lg border border-white/10 bg-black text-zinc-400 hover:text-white"
                        title="Send Cheer"
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleFollow(student)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                        student.isFollowing
                          ? 'border border-white/10 bg-black text-zinc-400 hover:text-white'
                          : 'bg-white text-black hover:bg-zinc-200'
                      }`}
                    >
                      {student.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Campus Study Streaks</h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">Resets Weekly</span>
          </div>

          <div className="space-y-2">
            {students.slice(0, 10).map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-black/60"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 font-mono text-xs font-bold text-center ${
                    idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{s.name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{s.degree || 'Student'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  <span>{s.streak} Days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white">Launch Study Room</h3>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-zinc-500 hover:text-white">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Room Name</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Res Squad"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Duration</label>
                <select
                  value={roomDuration}
                  onChange={e => setRoomDuration(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                >
                  <option value={25}>25 Minutes (Standard Pomodoro)</option>
                  <option value={50}>50 Minutes (Extended Block)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
                >
                  {isCreatingRoom ? 'Launching...' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

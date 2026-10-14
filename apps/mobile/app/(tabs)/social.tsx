import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  UserPlus,
  Zap,
  Flame,
  Coffee,
  ThumbsUp,
  Radio,
  Share2,
  Plus,
  Search,
  Check,
  X,
  Copy,
  Clock,
  KeyRound,
  Play,
  Pause,
  LogOut,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { getSafeErrorMessage } from '../../lib/errors';
import { useThemeColors, type ThemeColors } from '../../lib/theme';
import {
  calculateRemainingSeconds,
  type StudyRoomClockState,
  type CheerIconType,
  type RoomCheerPayload,
  type RoomPresenceState,
} from '@saktus/shared';

interface StudentProfile {
  id: string;
  name: string;
  username: string | null;
  degree: string | null;
  streak: number;
  isStudying: boolean;
  isFollowing: boolean;
  isMutual: boolean;
}

interface StudyRoomItem {
  id: string;
  name: string;
  code: string;
  duration_seconds: number;
  elapsed_seconds_at_pause: number;
  status: 'active' | 'paused' | 'completed';
  last_resumed_at: string | null;
  host_id: string;
  host_name?: string;
  member_count?: number;
}

interface ActiveCheerToast {
  id: string;
  icon: CheerIconType;
  sender_name: string;
}

type TabFilter = 'all' | 'mutual' | 'sprints';

const CHEER_BUTTONS: { key: CheerIconType; label: string; icon: any; color: string }[] = [
  { key: 'Zap', label: 'Energy', icon: Zap, color: '#F59E0B' },
  { key: 'Flame', label: 'Fire', icon: Flame, color: '#EF4444' },
  { key: 'Coffee', label: 'Break', icon: Coffee, color: '#D97706' },
  { key: 'ThumbsUp', label: 'Solid', icon: ThumbsUp, color: '#10B981' },
];

export default function SocialScreen() {
  const { user, profile } = useAuth();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Segmented Control Filter
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Active Joined Room
  const [joinedRoom, setJoinedRoom] = useState<StudyRoomItem | null>(null);
  const [roomTimeRemaining, setRoomTimeRemaining] = useState(25 * 60);
  const [roomPresenceCount, setRoomPresenceCount] = useState<number>(1);
  const [activeCheer, setActiveCheer] = useState<ActiveCheerToast | null>(null);

  const channelRef = useRef<any>(null);

  // Find Classmates Modal
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Create Room Modal
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDuration, setRoomDuration] = useState(25);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Join Room Modal
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Load Data
  const loadData = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const [profilesRes, followsRes, roomsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, university, degree, study_streak_days, is_studying_now, current_subject, last_study_date')
          .neq('id', user.id)
          .limit(40),
        supabase.from('follows').select('*'),
        supabase
          .from('study_rooms')
          .select('*, profiles:host_id(full_name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const follows = followsRes.data || [];
      const followingIds = new Set(
        follows.filter((f: any) => f.follower_id === user.id).map((f: any) => f.followee_id)
      );
      const followerIds = new Set(
        follows.filter((f: any) => f.followee_id === user.id).map((f: any) => f.follower_id)
      );

      const mappedStudents: StudentProfile[] = (profilesRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Student',
        username: p.username,
        degree: p.degree,
        streak: p.study_streak_days || 0,
        isStudying: p.is_studying_now || false,
        isFollowing: followingIds.has(p.id),
        isMutual: followingIds.has(p.id) && followerIds.has(p.id),
      }));
      setStudents(mappedStudents);

      const mappedRooms: StudyRoomItem[] = (roomsRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        duration_seconds: r.duration_seconds || 1500,
        elapsed_seconds_at_pause: r.elapsed_seconds_at_pause || 0,
        status: r.status || 'active',
        last_resumed_at: r.last_resumed_at,
        host_id: r.host_id,
        host_name: r.profiles?.full_name || 'Host',
      }));
      setStudyRooms(mappedRooms);
    } catch (e: any) {
      console.error('Social load error:', e);
      setErrorMsg(getSafeErrorMessage(e, 'Failed to load social sprints. Something went wrong.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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

      const rem = calculateRemainingSeconds(state);
      setRoomTimeRemaining(rem);

      if (rem === 0 && joinedRoom.status === 'active') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('Sprint Complete', '25 minutes logged to your course total. Take a 5-minute break.');
        setJoinedRoom((prev) => (prev ? { ...prev, status: 'completed' } : null));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [joinedRoom]);

  // Supabase Realtime Broadcast & Presence
  useEffect(() => {
    if (!joinedRoom || !user) return;

    const channelName = `study_room:${joinedRoom.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });

    channelRef.current = channel;

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

    channel.on('broadcast', { event: 'cheer' }, ({ payload }: { payload: RoomCheerPayload }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const cheerItem: ActiveCheerToast = {
        id: `${payload.sender_id}-${Date.now()}`,
        icon: payload.icon,
        sender_name: payload.sender_name,
      };
      setActiveCheer(cheerItem);
      setTimeout(() => {
        setActiveCheer((curr) => (curr?.id === cheerItem.id ? null : curr));
      }, 1200);
    });

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const count = Object.keys(presenceState).length;
      setRoomPresenceCount(Math.max(1, count));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          name: profile?.full_name || 'Classmate',
          is_studying: true,
        });
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [joinedRoom?.id, user, profile]);

  // Trigger Haptic Cheer
  const handleSendCheer = async (icon: CheerIconType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!channelRef.current || !user) return;

    const senderName = profile?.full_name || 'Classmate';
    const payload: RoomCheerPayload = {
      icon,
      sender_name: senderName,
      sender_id: user.id,
      timestamp: new Date().toISOString(),
    };

    await channelRef.current.send({
      type: 'broadcast',
      event: 'cheer',
      payload,
    });

    const cheerItem: ActiveCheerToast = {
      id: `self-${Date.now()}`,
      icon,
      sender_name: 'You',
    };
    setActiveCheer(cheerItem);
    setTimeout(() => {
      setActiveCheer((curr) => (curr?.id === cheerItem.id ? null : curr));
    }, 1200);
  };

  // Host Action: Pause / Resume Sprint
  const handleToggleSprintTimer = async () => {
    if (!joinedRoom || joinedRoom.host_id !== user?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const isPausing = joinedRoom.status === 'active';

    if (isPausing) {
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
    }
  };

  // Follow / Unfollow Action
  const handleToggleFollow = async (student: StudentProfile) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const newFollowing = !student.isFollowing;
    setStudents((prev: StudentProfile[]) =>
      prev.map((s: StudentProfile) => (s.id === student.id ? { ...s, isFollowing: newFollowing } : s))
    );
    setSearchResults((prev: StudentProfile[]) =>
      prev.map((s: StudentProfile) => (s.id === student.id ? { ...s, isFollowing: newFollowing } : s))
    );

    try {
      if (student.isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', student.id);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, followee_id: student.id });
      }
    } catch {
      loadData();
    }
  };

  // Search Students
  const handleSearchStudents = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      const follows = (await supabase.from('follows').select('*')).data || [];
      const followingIds = new Set(
        follows.filter((f: any) => f.follower_id === user.id).map((f: any) => f.followee_id)
      );
      const followerIds = new Set(
        follows.filter((f: any) => f.followee_id === user.id).map((f: any) => f.follower_id)
      );

      const mapped: StudentProfile[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Student',
        username: p.username,
        degree: p.degree,
        streak: p.study_streak_days || 0,
        isStudying: p.is_studying_now || false,
        isFollowing: followingIds.has(p.id),
        isMutual: followingIds.has(p.id) && followerIds.has(p.id),
      }));

      setSearchResults(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // Create Study Sprint
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Notice', 'Fill this in: Room name is required.');
      return;
    }
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCreatingRoom(true);

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const durationSec = roomDuration * 60;
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          host_id: user.id,
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
        user_id: user.id,
      });

      setJoinedRoom({
        id: data.id,
        name: data.name,
        code: data.code,
        duration_seconds: data.duration_seconds ?? durationSec,
        elapsed_seconds_at_pause: 0,
        status: 'active',
        last_resumed_at: nowIso,
        host_id: data.host_id,
        host_name: 'You',
      });
      setRoomTimeRemaining(durationSec);

      setIsCreateRoomOpen(false);
      setRoomName('');
      loadData();
    } catch (e: any) {
      console.error('Create room error:', e);
      Alert.alert('Error', getSafeErrorMessage(e, 'Failed to create room. Something went wrong.'));
    } finally {
      setCreatingRoom(false);
    }
  };

  // Join Room by Code
  const handleJoinWithCode = async () => {
    if (!joinCodeInput.trim()) {
      setJoinError('Fill this in: Please enter a 6-digit sprint code.');
      return;
    }
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setJoiningRoom(true);
    setJoinError('');

    try {
      const code = joinCodeInput.trim().toUpperCase();
      const { data: room, error } = await supabase
        .from('study_rooms')
        .select('*, profiles:host_id(full_name)')
        .eq('code', code)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !room) {
        setJoinError('Invalid or expired room code.');
        setJoiningRoom(false);
        return;
      }

      await supabase
        .from('study_room_members')
        .upsert({ room_id: room.id, user_id: user.id });

      const newJoinedRoom: StudyRoomItem = {
        id: room.id,
        name: room.name,
        code: room.code,
        duration_seconds: room.duration_seconds || 1500,
        elapsed_seconds_at_pause: room.elapsed_seconds_at_pause || 0,
        status: (room.status as 'active' | 'paused' | 'completed') || 'active',
        last_resumed_at: room.last_resumed_at,
        host_id: room.host_id,
        host_name: room.profiles?.full_name || 'Host',
      };

      setJoinedRoom(newJoinedRoom);
      setRoomTimeRemaining(
        calculateRemainingSeconds({
          durationSeconds: newJoinedRoom.duration_seconds,
          elapsedSecondsAtPause: newJoinedRoom.elapsed_seconds_at_pause,
          lastResumedAt: newJoinedRoom.last_resumed_at,
          status: newJoinedRoom.status,
        })
      );

      setIsJoinCodeOpen(false);
      setJoinCodeInput('');
      loadData();
    } catch (e: any) {
      console.error('Join room error:', e);
      setJoinError(getSafeErrorMessage(e, 'Failed to join room. Something went wrong.'));
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleShareCode = async (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: `Join my focus sprint on Saktus! Room code: ${code}`,
      });
    } catch {}
  };

  const followedFriends = students.filter((s: StudentProfile) => s.isFollowing);
  const mutualFriends = students.filter((s: StudentProfile) => s.isMutual);
  const rankedStudents = [...students].sort((a: StudentProfile, b: StudentProfile) => b.streak - a.streak);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.isDark ? '#FFFFFF' : '#09090B'}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Social Study</Text>
            <Text style={styles.subtitle}>Synchronized focus sprints with classmates</Text>
          </View>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.findFriendsBtn, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSearchQuery('');
              setSearchResults([]);
              setIsFindModalOpen(true);
            }}
          >
            <UserPlus size={14} color={theme.buttonPrimaryText} />
            <Text style={styles.findFriendsText}>Find Classmates</Text>
          </Pressable>
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Active Study Room HUD */}
        {joinedRoom && (
          <View style={styles.activeRoomCard}>
            {/* Realtime Cheer Floating Pill */}
            {activeCheer && (
              <View style={styles.cheerFloatingBadge}>
                <Text style={styles.cheerFloatingText}>
                  {activeCheer.sender_name} cheered with {activeCheer.icon}!
                </Text>
              </View>
            )}

            <View style={styles.activeRoomHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE SPRINT · {joinedRoom.status.toUpperCase()}</Text>
              </View>
              <Pressable
                style={({ pressed }: { pressed: boolean }) => [styles.copyCodePill, pressed && styles.pressed]}
                onPress={() => handleShareCode(joinedRoom.code)}
              >
                <Text style={styles.copyCodeText}>CODE: {joinedRoom.code}</Text>
                <Share2 size={12} color={theme.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.clockRow}>
              <Text style={styles.countdownTimer}>
                {Math.floor(roomTimeRemaining / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(roomTimeRemaining % 60).toString().padStart(2, '0')}
              </Text>
              <View style={styles.memberCountPill}>
                <Users size={12} color="#10B981" />
                <Text style={styles.memberCountText}>{roomPresenceCount} studying</Text>
              </View>
            </View>

            <Text style={styles.activeRoomTitle}>{joinedRoom.name}</Text>
            <Text style={styles.activeRoomHost}>Host: {joinedRoom.host_name}</Text>

            {/* Haptic Cheer Action Bar */}
            <View style={styles.cheerSection}>
              <Text style={styles.cheerSectionTitle}>SEND TACTILE CHEER</Text>
              <View style={styles.cheerButtonsRow}>
                {CHEER_BUTTONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.key}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.cheerBtn,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleSendCheer(item.key)}
                    >
                      <Icon size={16} color={item.color} />
                      <Text style={styles.cheerBtnLabel}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Room Actions */}
            <View style={styles.activeRoomActions}>
              {joinedRoom.host_id === user?.id && (
                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.hostControlBtn, pressed && styles.pressed]}
                  onPress={handleToggleSprintTimer}
                >
                  {joinedRoom.status === 'active' ? (
                    <>
                      <Pause size={12} color={theme.textPrimary} />
                      <Text style={styles.hostControlText}>Pause Sprint</Text>
                    </>
                  ) : (
                    <>
                      <Play size={12} color={theme.textPrimary} />
                      <Text style={styles.hostControlText}>Resume Sprint</Text>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                style={({ pressed }: { pressed: boolean }) => [styles.leaveRoomBtn, pressed && styles.pressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setJoinedRoom(null);
                }}
              >
                <LogOut size={12} color="#EF4444" />
                <Text style={styles.leaveRoomText}>Leave Sprint</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Segmented Filter Control (Section 5.2) */}
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'all' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('all');
            }}
          >
            <Text style={[styles.segmentText, activeTab === 'all' && styles.segmentTextActive]}>
              All ({students.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'mutual' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('mutual');
            }}
          >
            <Text style={[styles.segmentText, activeTab === 'mutual' && styles.segmentTextActive]}>
              Mutual ({mutualFriends.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'sprints' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActiveTab('sprints');
            }}
          >
            <Text style={[styles.segmentText, activeTab === 'sprints' && styles.segmentTextActive]}>
              Sprints ({studyRooms.length})
            </Text>
          </Pressable>
        </View>

        {/* Study Sprints Section */}
        {(activeTab === 'all' || activeTab === 'sprints') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Study Sprints</Text>
              <View style={styles.roomHeaderBtns}>
                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.roomHeaderAction, pressed && styles.pressed]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setJoinError('');
                    setIsJoinCodeOpen(true);
                  }}
                >
                  <KeyRound size={12} color={theme.textSecondary} />
                  <Text style={styles.roomHeaderActionText}>Join by Code</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.launchRoomBtn, pressed && styles.pressed]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setIsCreateRoomOpen(true);
                  }}
                >
                  <Plus size={12} color={theme.buttonPrimaryText} />
                  <Text style={styles.launchRoomText}>Create Sprint</Text>
                </Pressable>
              </View>
            </View>

            {studyRooms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Radio size={24} color={theme.textMuted} />
                <Text style={styles.emptyTitle}>No active study sprints.</Text>
                <Text style={styles.emptySub}>
                  Start a synchronized sprint or share a 6-digit room code with classmates.
                </Text>
              </View>
            ) : (
              studyRooms.map((room) => (
                <View key={room.id} style={styles.roomCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.roomTopRow}>
                      <View style={styles.liveSprintPill}>
                        <View style={styles.liveSprintDot} />
                        <Text style={styles.liveSprintText}>LIVE</Text>
                      </View>
                      <Text style={styles.roomHostText}>Hosted by {room.host_name}</Text>
                    </View>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <View style={styles.roomMetaRow}>
                      <Clock size={11} color={theme.textMuted} />
                      <Text style={styles.roomDurationText}>
                        {Math.floor(room.duration_seconds / 60)}m focus
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }: { pressed: boolean }) => [styles.joinRoomBtn, pressed && styles.pressed]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setJoinedRoom(room);
                      setRoomTimeRemaining(
                        calculateRemainingSeconds({
                          durationSeconds: room.duration_seconds,
                          elapsedSecondsAtPause: room.elapsed_seconds_at_pause,
                          lastResumedAt: room.last_resumed_at,
                          status: room.status,
                        })
                      );
                    }}
                  >
                    <Text style={styles.joinRoomBtnText}>Join Sprint</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Classmates Section */}
        {(activeTab === 'all' || activeTab === 'mutual') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeTab === 'mutual' ? 'Mutual Friends' : 'Classmates You Follow'}
              </Text>
            </View>

            {(activeTab === 'mutual' ? mutualFriends : followedFriends).length === 0 ? (
              <View style={styles.emptyCard}>
                <Users size={24} color={theme.textMuted} />
                <Text style={styles.emptyTitle}>No students followed yet.</Text>
                <Text style={styles.emptySub}>
                  Follow classmates from your course to view their active study sessions and join co-working sprints.
                </Text>
                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.emptyActionBtn, pressed && styles.pressed]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setIsFindModalOpen(true);
                  }}
                >
                  <Text style={styles.emptyActionText}>Find Classmates</Text>
                </Pressable>
              </View>
            ) : (
              (activeTab === 'mutual' ? mutualFriends : followedFriends).map((s: StudentProfile) => (
                <View key={s.id} style={styles.friendCard}>
                  <View style={styles.friendLeft}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarMiniText}>
                        {s.name.substring(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.friendName} numberOfLines={1}>
                          {s.name}
                        </Text>
                        {s.isMutual && (
                          <View style={styles.mutualBadge}>
                            <Text style={styles.mutualText}>Mutual</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.friendSub} numberOfLines={1}>
                        {s.username ? `@${s.username} · ` : ''}
                        {s.streak}d streak
                        {s.isStudying ? ' · Studying Now' : ''}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }: { pressed: boolean }) => [styles.followingBtn, pressed && styles.pressed]}
                    onPress={() => handleToggleFollow(s)}
                  >
                    <Text style={styles.followingBtnText}>Following</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Streak Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Streak Leaderboard</Text>
          </View>

          {rankedStudents.slice(0, 10).map((s, idx) => (
            <View key={s.id} style={styles.leaderboardRow}>
              <Text style={[styles.rankNum, idx === 0 && styles.rankNumFirst]}>
                {idx + 1}
              </Text>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={styles.lbName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.lbSub} numberOfLines={1}>
                  {s.username ? `@${s.username}` : s.degree || 'Student'}
                </Text>
              </View>
              <View style={styles.streakPill}>
                <Flame size={13} color="#F59E0B" />
                <Text style={styles.streakPillText}>{s.streak}d</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Find Classmates Modal */}
      <Modal visible={isFindModalOpen} animationType="slide" transparent onRequestClose={() => setIsFindModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={[styles.modalCard, { height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Find Classmates</Text>
                <Pressable
                  onPress={() => setIsFindModalOpen(false)}
                  hitSlop={8}
                >
                  <X size={20} color={theme.textMuted} />
                </Pressable>
              </View>

              <View style={styles.searchBar}>
                <Search size={16} color={theme.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or @username..."
                  placeholderTextColor={theme.textMuted}
                  value={searchQuery}
                  onChangeText={handleSearchStudents}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {searching ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={theme.textPrimary} />
              ) : (
                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {searchResults.length === 0 && searchQuery ? (
                    <Text style={styles.modalEmptyText}>
                      No students found matching "{searchQuery}".
                    </Text>
                  ) : (
                    (searchQuery ? searchResults : students.slice(0, 15)).map((s: StudentProfile) => (
                      <View key={s.id} style={styles.searchItem}>
                        <View style={styles.friendLeft}>
                          <View style={styles.avatarMini}>
                            <Text style={styles.avatarMiniText}>
                              {s.name.substring(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            <Text style={styles.friendName} numberOfLines={1}>
                              {s.name}
                            </Text>
                            <Text style={styles.friendSub} numberOfLines={1}>
                              {s.username ? `@${s.username}` : ''}
                              {s.streak > 0 ? ` · ${s.streak}d streak` : ''}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          style={({ pressed }: { pressed: boolean }) => [
                            styles.followActionBtn,
                            s.isFollowing && styles.followActionBtnActive,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleToggleFollow(s)}
                        >
                          <Text
                            style={[
                              styles.followActionText,
                              s.isFollowing && styles.followActionTextActive,
                            ]}
                          >
                            {s.isFollowing ? 'Following' : 'Follow'}
                          </Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Create Room Modal */}
      <Modal visible={isCreateRoomOpen} animationType="slide" transparent onRequestClose={() => setIsCreateRoomOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Study Sprint</Text>
                <Pressable onPress={() => setIsCreateRoomOpen(false)} hitSlop={8}>
                  <X size={20} color={theme.textMuted} />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>SPRINT NAME</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Linear Algebra Proofs"
                    placeholderTextColor={theme.textMuted}
                    value={roomName}
                    onChangeText={setRoomName}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>DURATION</Text>
                  <View style={styles.durationPillsRow}>
                    {[25, 45, 60].map((mins) => (
                      <Pressable
                        key={mins}
                        style={[
                          styles.durationBtn,
                          roomDuration === mins && styles.durationBtnActive,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setRoomDuration(mins);
                        }}
                      >
                        <Text
                          style={[
                            styles.durationBtnText,
                            roomDuration === mins && styles.durationBtnTextActive,
                          ]}
                        >
                          {mins} mins
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.saveBtn, pressed && styles.pressed]}
                  onPress={handleCreateRoom}
                  disabled={creatingRoom}
                >
                  {creatingRoom ? (
                    <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                  ) : (
                    <Text style={styles.saveBtnText}>Launch Sprint & Generate Code</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Join Room with Code Modal (Section 6 Micro-Copy Matrix) */}
      <Modal visible={isJoinCodeOpen} animationType="slide" transparent onRequestClose={() => setIsJoinCodeOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Join with Room Code</Text>
                <Pressable onPress={() => setIsJoinCodeOpen(false)} hitSlop={8}>
                  <X size={20} color={theme.textMuted} />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {joinError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{joinError}</Text>
                  </View>
                ) : null}

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>ENTER 6-DIGIT SPRINT CODE</Text>
                  <TextInput
                    style={[styles.modalInput, styles.codeInput]}
                    placeholder="e.g. 849-201"
                    placeholderTextColor={theme.textMuted}
                    value={joinCodeInput}
                    onChangeText={(val: string) => setJoinCodeInput(val.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                  <Text style={styles.modalHelperText}>
                    Room codes are shared directly by the sprint host.
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.saveBtn, pressed && styles.pressed]}
                  onPress={handleJoinWithCode}
                  disabled={joiningRoom}
                >
                  {joiningRoom ? (
                    <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                  ) : (
                    <Text style={styles.saveBtnText}>Join Sprint</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 100 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, letterSpacing: -0.4 },
    subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    findFriendsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    findFriendsText: { color: theme.buttonPrimaryText, fontSize: 12, fontWeight: '700' },
    pressed: { transform: [{ scale: 0.97 }] },
    errorBox: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: 10,
      padding: 10,
      marginBottom: 16,
    },
    errorText: { color: '#EF4444', fontSize: 12 },
    activeRoomCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(16,185,129,0.3)',
      padding: 16,
      marginBottom: 20,
      gap: 10,
    },
    cheerFloatingBadge: {
      backgroundColor: theme.isDark ? '#FFFFFF' : '#09090B',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'center',
      marginBottom: 4,
    },
    cheerFloatingText: {
      color: theme.isDark ? '#000000' : '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    activeRoomHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    liveLabel: { color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    copyCodePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surfaceHover,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    copyCodeText: {
      color: theme.textPrimary,
      fontSize: 11,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontVariant: ['tabular-nums'],
    },
    clockRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    countdownTimer: {
      color: theme.textPrimary,
      fontSize: 40,
      fontWeight: '800',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontVariant: ['tabular-nums'],
      letterSpacing: -1,
    },
    memberCountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16,185,129,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    memberCountText: {
      color: '#10B981',
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    activeRoomTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
    activeRoomHost: { color: theme.textMuted, fontSize: 12 },
    cheerSection: {
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.borderSubtle,
      gap: 8,
    },
    cheerSectionTitle: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    cheerButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    cheerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: theme.surfaceSubtle,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cheerBtnLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    activeRoomActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.borderSubtle,
    },
    hostControlBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    hostControlText: { color: theme.textPrimary, fontSize: 11, fontWeight: '600' },
    leaveRoomBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(239,68,68,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.3)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    leaveRoomText: { color: '#EF4444', fontSize: 11, fontWeight: '600' },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 3,
      marginBottom: 20,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentBtnActive: {
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentText: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    segmentTextActive: {
      color: theme.textPrimary,
      fontWeight: '700',
    },
    section: { marginBottom: 24 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
    roomHeaderBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    roomHeaderAction: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    roomHeaderActionText: { color: theme.textSecondary, fontSize: 11, fontWeight: '500' },
    launchRoomBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    launchRoomText: { color: theme.buttonPrimaryText, fontSize: 11, fontWeight: '700' },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 16,
      gap: 6,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surfaceSubtle,
    },
    emptyTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    emptySub: { color: theme.textMuted, fontSize: 11, textAlign: 'center', maxWidth: 280 },
    emptyActionBtn: {
      marginTop: 8,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
    },
    emptyActionText: { color: theme.buttonPrimaryText, fontSize: 11, fontWeight: '700' },
    roomCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 8,
    },
    roomTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    liveSprintPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16,185,129,0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    liveSprintDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
    liveSprintText: { color: '#10B981', fontSize: 9, fontWeight: '800' },
    roomHostText: { color: theme.textMuted, fontSize: 10 },
    roomName: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
    roomMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    roomDurationText: { color: theme.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
    joinRoomBtn: {
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    joinRoomBtnText: { color: theme.buttonPrimaryText, fontSize: 11, fontWeight: '700' },
    friendCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 8,
    },
    friendLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
    avatarMini: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarMiniText: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    friendName: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    mutualBadge: {
      backgroundColor: 'rgba(16,185,129,0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    mutualText: { color: '#10B981', fontSize: 9, fontWeight: '700' },
    friendSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
    followingBtn: {
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    followingBtnText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
    leaderboardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 6,
      gap: 12,
    },
    rankNum: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: '700',
      width: 20,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    rankNumFirst: { color: '#F59E0B' },
    lbName: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    lbSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245,158,11,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    streakPillText: { color: '#F59E0B', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    keyboardAvoid: { width: '100%', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      maxHeight: '90%',
    },
    modalScrollContent: {
      gap: 14,
      paddingBottom: 20,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
    modalErrorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 8 },
    modalErrorText: { color: '#EF4444', fontSize: 11 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInput: { flex: 1, color: theme.textPrimary, fontSize: 13 },
    modalEmptyText: { color: theme.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
    searchItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    followActionBtn: {
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
    },
    followActionBtnActive: {
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
    },
    followActionText: { color: theme.buttonPrimaryText, fontSize: 12, fontWeight: '700' },
    followActionTextActive: { color: theme.textSecondary },
    modalField: { gap: 6 },
    modalLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    modalHelperText: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
    modalInput: {
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      height: 44,
      color: theme.textPrimary,
      fontSize: 13,
    },
    codeInput: {
      textAlign: 'center',
      letterSpacing: 4,
      fontSize: 18,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    durationPillsRow: { flexDirection: 'row', gap: 8 },
    durationBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    durationBtnActive: { backgroundColor: theme.buttonPrimaryBg, borderColor: theme.buttonPrimaryBg },
    durationBtnText: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    durationBtnTextActive: { color: theme.buttonPrimaryText, fontWeight: '800' },
    saveBtn: {
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    saveBtnText: { color: theme.buttonPrimaryText, fontSize: 13, fontWeight: '700' },
  });
}

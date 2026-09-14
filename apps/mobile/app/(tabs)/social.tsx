import React, { useState, useEffect, useCallback } from 'react';
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
  Radio,
  Share2,
  Plus,
  Search,
  Check,
  X,
  Copy,
  Clock,
  KeyRound,
  Sparkles,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { getSafeErrorMessage } from '../../lib/errors';

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
  host_id: string;
  host_name?: string;
}

export default function SocialScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Joined Room
  const [joinedRoom, setJoinedRoom] = useState<StudyRoomItem | null>(null);
  const [roomTimeRemaining, setRoomTimeRemaining] = useState(25 * 60);

  // Find Friends Modal
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
        host_id: r.host_id,
        host_name: r.profiles?.full_name || 'Host',
      }));
      setStudyRooms(mappedRooms);
    } catch (e: any) {
      console.error('Social load error:', e);
      setErrorMsg(getSafeErrorMessage(e, 'Failed to load friends. Something went wrong.'));
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

  // Follow / Unfollow Action
  const handleToggleFollow = async (student: StudentProfile) => {
    if (!user) return;

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

  // Search Students by Name or @username
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

  // Create Study Room
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Notice', 'Fill this in: Room name is required.');
      return;
    }
    if (!user) return;
    setCreatingRoom(true);

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const durationSec = roomDuration * 60;

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          host_id: user.id,
          name: roomName.trim(),
          code: roomCode,
          duration_seconds: durationSec,
          elapsed_seconds_at_pause: 0,
          status: 'active',
          last_resumed_at: new Date().toISOString(),
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
      setJoinError('Fill this in: Please enter a room code.');
      return;
    }
    if (!user) return;
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

      setJoinedRoom({
        id: room.id,
        name: room.name,
        code: room.code,
        duration_seconds: room.duration_seconds || 1500,
        host_id: room.host_id,
        host_name: room.profiles?.full_name || 'Host',
      });
      setRoomTimeRemaining(room.duration_seconds || 1500);

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
    try {
      await Share.share({
        message: `Join my study room on Saktus! Room code: ${code}`,
      });
    } catch {}
  };

  const followedFriends = students.filter((s: StudentProfile) => s.isFollowing);
  const rankedStudents = [...students].sort((a: StudentProfile, b: StudentProfile) => b.streak - a.streak);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Friends & Study Rooms</Text>
            <Text style={styles.subtitle}>Study together and track streaks</Text>
          </View>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.findFriendsBtn, pressed && styles.pressed]}
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setIsFindModalOpen(true);
            }}
          >
            <UserPlus size={15} color="#000000" />
            <Text style={styles.findFriendsText}>Find Friends</Text>
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
            <View style={styles.activeRoomHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>IN STUDY ROOM</Text>
              </View>
              <Pressable
                style={styles.copyCodePill}
                onPress={() => handleShareCode(joinedRoom.code)}
              >
                <Text style={styles.copyCodeText}>CODE: {joinedRoom.code}</Text>
                <Share2 size={12} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={styles.activeRoomTitle}>{joinedRoom.name}</Text>
            <Text style={styles.activeRoomHost}>Host: {joinedRoom.host_name}</Text>

            <View style={styles.activeRoomActions}>
              <Pressable
                style={styles.leaveRoomBtn}
                onPress={() => setJoinedRoom(null)}
              >
                <Text style={styles.leaveRoomText}>Leave Room</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Study Rooms Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Study Rooms</Text>
            <View style={styles.roomHeaderBtns}>
              <Pressable
                style={styles.roomHeaderAction}
                onPress={() => {
                  setJoinError('');
                  setIsJoinCodeOpen(true);
                }}
              >
                <KeyRound size={12} color="#A1A1AA" />
                <Text style={styles.roomHeaderActionText}>Join with Code</Text>
              </Pressable>
              <Pressable
                style={styles.launchRoomBtn}
                onPress={() => setIsCreateRoomOpen(true)}
              >
                <Plus size={12} color="#000000" />
                <Text style={styles.launchRoomText}>Launch Room</Text>
              </Pressable>
            </View>
          </View>

          {studyRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Radio size={24} color="#52525B" />
              <Text style={styles.emptyTitle}>No active study rooms</Text>
              <Text style={styles.emptySub}>
                Tap "Launch Room" above or enter a 6-character squad code.
              </Text>
            </View>
          ) : (
            studyRooms.map((room: any) => (
              <View key={room.id} style={styles.roomCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomHost}>
                    Host: {room.host_name} · {Math.floor(room.duration_seconds / 60)} min
                  </Text>
                </View>
                <Pressable
                  style={styles.joinRoomBtn}
                  onPress={() => {
                    setJoinedRoom(room);
                    setRoomTimeRemaining(room.duration_seconds);
                  }}
                >
                  <Text style={styles.joinRoomBtnText}>Join</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Followed Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Friends You Follow ({followedFriends.length})
            </Text>
          </View>

          {followedFriends.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={24} color="#52525B" />
              <Text style={styles.emptyTitle}>You're not following anyone yet</Text>
              <Text style={styles.emptySub}>
                Tap "Find Friends" above to search by name or @username.
              </Text>
            </View>
          ) : (
            followedFriends.map((s: StudentProfile) => (
              <View key={s.id} style={styles.friendCard}>
                <View style={styles.friendLeft}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>
                      {s.name.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.friendName} numberOfLines={1}>{s.name}</Text>
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
                  style={styles.followingBtn}
                  onPress={() => handleToggleFollow(s)}
                >
                  <Text style={styles.followingBtnText}>Following</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

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
                <Text style={styles.lbName} numberOfLines={1}>{s.name}</Text>
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

      {/* Find Friends Search Modal */}
      <Modal visible={isFindModalOpen} animationType="slide" transparent onRequestClose={() => setIsFindModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={[styles.modalCard, { height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Find Friends</Text>
                <Pressable onPress={() => setIsFindModalOpen(false)} hitSlop={8}>
                  <X size={20} color="#71717A" />
                </Pressable>
              </View>

              {/* Search Input */}
              <View style={styles.searchBar}>
                <Search size={16} color="#71717A" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or @username..."
                  placeholderTextColor="#52525B"
                  value={searchQuery}
                  onChangeText={handleSearchStudents}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {searching ? (
                <ActivityIndicator style={{ marginTop: 20 }} color="#FFFFFF" />
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
                            <Text style={styles.friendName} numberOfLines={1}>{s.name}</Text>
                            <Text style={styles.friendSub} numberOfLines={1}>
                              {s.username ? `@${s.username}` : ''}
                              {s.streak > 0 ? ` · ${s.streak}d streak` : ''}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          style={[styles.followActionBtn, s.isFollowing && styles.followActionBtnActive]}
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
                <Text style={styles.modalTitle}>Launch Study Room</Text>
                <Pressable onPress={() => setIsCreateRoomOpen(false)} hitSlop={8}>
                  <X size={20} color="#71717A" />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>ROOM NAME</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Late Night Problem Set"
                    placeholderTextColor="#52525B"
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
                        onPress={() => setRoomDuration(mins)}
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
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.saveBtnText}>Launch & Generate Code</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Join Room with Code Modal */}
      <Modal visible={isJoinCodeOpen} animationType="slide" transparent onRequestClose={() => setIsJoinCodeOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Join with Squad Code</Text>
                <Pressable onPress={() => setIsJoinCodeOpen(false)} hitSlop={8}>
                  <X size={20} color="#71717A" />
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
                  <Text style={styles.modalLabel}>6-CHARACTER ROOM CODE</Text>
                  <TextInput
                    style={[styles.modalInput, styles.codeInput]}
                    placeholder="e.g. X7K9P2"
                    placeholderTextColor="#52525B"
                    value={joinCodeInput}
                    onChangeText={(val: string) => setJoinCodeInput(val.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                </View>

                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.saveBtn, pressed && styles.pressed]}
                  onPress={handleJoinWithCode}
                  disabled={joiningRoom}
                >
                  {joiningRoom ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.saveBtnText}>Join Study Room</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: '#71717A', marginTop: 2 },
  findFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  findFriendsText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.97 }] },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 12 },
  activeRoomCard: {
    backgroundColor: '#09090B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    padding: 16,
    marginBottom: 20,
    gap: 8,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyCodeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  activeRoomTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  activeRoomHost: { color: '#71717A', fontSize: 12 },
  activeRoomActions: { flexDirection: 'row', marginTop: 4 },
  leaveRoomBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  leaveRoomText: { color: '#EF4444', fontSize: 11, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  roomHeaderBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomHeaderAction: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  roomHeaderActionText: { color: '#A1A1AA', fontSize: 11, fontWeight: '500' },
  launchRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  launchRoomText: { color: '#000000', fontSize: 11, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    backgroundColor: 'rgba(9,9,11,0.5)',
  },
  emptyTitle: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  emptySub: { color: '#52525B', fontSize: 11, textAlign: 'center', maxWidth: 260 },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 8,
  },
  roomName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  roomHost: { color: '#71717A', fontSize: 11, marginTop: 3 },
  joinRoomBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinRoomBtnText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 8,
  },
  friendLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  friendName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  mutualBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mutualText: { color: '#10B981', fontSize: 9, fontWeight: '700' },
  friendSub: { color: '#71717A', fontSize: 11, marginTop: 2 },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingBtnText: { color: '#A1A1AA', fontSize: 11, fontWeight: '600' },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    marginBottom: 6,
    gap: 12,
  },
  rankNum: { color: '#71717A', fontSize: 13, fontWeight: '700', width: 20, textAlign: 'center' },
  rankNumFirst: { color: '#F59E0B' },
  lbName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  lbSub: { color: '#71717A', fontSize: 11, marginTop: 2 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakPillText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  keyboardAvoid: { width: '100%', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#09090B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    maxHeight: '90%',
  },
  modalScrollContent: {
    gap: 14,
    paddingBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  modalErrorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 8 },
  modalErrorText: { color: '#EF4444', fontSize: 11 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  modalEmptyText: { color: '#71717A', fontSize: 12, textAlign: 'center', paddingVertical: 24 },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  followActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followActionBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  followActionText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  followActionTextActive: { color: '#A1A1AA' },
  modalField: { gap: 6 },
  modalLabel: { color: '#71717A', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    height: 44,
    color: '#FFFFFF',
    fontSize: 13,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  durationPillsRow: { flexDirection: 'row', gap: 8 },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationBtnActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  durationBtnText: { color: '#71717A', fontSize: 12, fontWeight: '600' },
  durationBtnTextActive: { color: '#000000', fontWeight: '800' },
  saveBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnText: { color: '#000000', fontSize: 13, fontWeight: '700' },
});

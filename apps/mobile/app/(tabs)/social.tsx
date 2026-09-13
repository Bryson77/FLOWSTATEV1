import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  UserPlus,
  Zap,
  Trophy,
  Flame,
  Radio,
  Share2,
  Plus
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface StudentProfile {
  id: string;
  name: string;
  username: string | null;
  degree: string | null;
  streak: number;
  isStudying: boolean;
  isFollowing: boolean;
}

interface StudyRoomItem {
  id: string;
  name: string;
  code: string;
  duration_seconds: number;
  host_name?: string;
}

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'network' | 'leaderboard'>('rooms');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [profilesRes, followsRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', user.id).limit(20),
        supabase.from('follows').select('*'),
        supabase.from('study_rooms').select('*, profiles:host_id(full_name)').eq('status', 'active').limit(10)
      ]);

      const follows = followsRes.data || [];
      const followingIds = new Set(follows.filter(f => f.follower_id === user.id).map(f => f.followee_id));

      const mappedStudents: StudentProfile[] = (profilesRes.data || []).map(p => ({
        id: p.id,
        name: p.full_name || 'Student',
        username: p.username,
        degree: p.degree,
        streak: p.study_streak_days || 0,
        isStudying: p.is_studying_now || false,
        isFollowing: followingIds.has(p.id)
      }));
      setStudents(mappedStudents);

      const mappedRooms: StudyRoomItem[] = (roomsRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        duration_seconds: r.duration_seconds || 1500,
        host_name: r.profiles?.full_name || 'Squad Host'
      }));
      setStudyRooms(mappedRooms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleFollow = async (student: StudentProfile) => {
    if (!currentUserId) return;
    if (student.isFollowing) {
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isFollowing: false } : s));
      try {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('followee_id', student.id);
      } catch {
        loadData();
      }
    } else {
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isFollowing: true } : s));
      try {
        await supabase.from('follows').insert({ follower_id: currentUserId, followee_id: student.id });
      } catch {
        loadData();
      }
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Study with me on Saktus — the calm academic cockpit: https://flowstateproductivity.xyz'
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Squads & Social</Text>
            <Text style={styles.subTitle}>Study rooms & streak leaderboards</Text>
          </View>
          <Pressable style={styles.shareBtn} onPress={handleShareApp}>
            <Share2 size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'rooms' && styles.tabBtnActive]}
            onPress={() => setActiveTab('rooms')}
          >
            <Text style={[styles.tabText, activeTab === 'rooms' && styles.tabTextActive]}>Rooms</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'network' && styles.tabBtnActive]}
            onPress={() => setActiveTab('network')}
          >
            <Text style={[styles.tabText, activeTab === 'network' && styles.tabTextActive]}>Follow</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'leaderboard' && styles.tabBtnActive]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>Leaderboard</Text>
          </Pressable>
        </View>

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <View style={styles.section}>
            {studyRooms.length === 0 ? (
              <View style={styles.emptyBox}>
                <Radio size={24} color="#71717A" />
                <Text style={styles.emptyTitle}>No live rooms right now</Text>
                <Text style={styles.emptySub}>Active rooms created by friends appear here.</Text>
              </View>
            ) : (
              studyRooms.map(room => (
                <View key={room.id} style={styles.roomCard}>
                  <View>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomHost}>Host: {room.host_name} · {Math.floor(room.duration_seconds / 60)}m</Text>
                  </View>
                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{room.code}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <View style={styles.section}>
            {students.map(s => (
              <View key={s.id} style={styles.studentCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.studentSub}>
                    {s.streak}d streak {s.isStudying ? '· Studying Now' : ''}
                  </Text>
                </View>

                <Pressable
                  style={[styles.followBtn, s.isFollowing && styles.followBtnActive]}
                  onPress={() => handleToggleFollow(s)}
                >
                  <Text style={[styles.followText, s.isFollowing && styles.followTextActive]}>
                    {s.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.section}>
            {students.map((s, idx) => (
              <View key={s.id} style={styles.lbRow}>
                <Text style={styles.lbRank}>{idx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.studentSub}>{s.degree || 'Degree Program'}</Text>
                </View>
                <View style={styles.streakPill}>
                  <Flame size={12} color="#F59E0B" />
                  <Text style={styles.streakPillText}>{s.streak}d</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  subTitle: { fontSize: 12, color: '#71717A', marginTop: 2 },
  shareBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#FFFFFF' },
  tabText: { color: '#71717A', fontSize: 12, fontWeight: '500' },
  tabTextActive: { color: '#000000', fontWeight: '700' },
  section: { gap: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16 },
  emptyTitle: { color: '#A0A0A0', fontSize: 14, fontWeight: '600' },
  emptySub: { color: '#71717A', fontSize: 12 },
  roomCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  roomName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  roomHost: { color: '#71717A', fontSize: 11, marginTop: 4 },
  codePill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  codeText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' },
  studentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  studentName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  studentSub: { color: '#71717A', fontSize: 11, marginTop: 2 },
  followBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  followBtnActive: { backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  followText: { color: '#000000', fontSize: 12, fontWeight: '600' },
  followTextActive: { color: '#A0A0A0' },
  lbRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, gap: 12 },
  lbRank: { color: '#F59E0B', fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  streakPillText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' }
});

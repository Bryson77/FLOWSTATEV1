import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Zap, Trophy, RefreshCw } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface StudentProfile {
  id: string;
  name: string;
  initials: string;
  subject: string;
  isStudying: boolean;
  streak: number;
}

interface LeaderboardItem {
  rank: number;
  name: string;
  streak: number;
  isSelf: boolean;
}

export default function SocialScreen() {
  const [cheered, setCheered] = useState<Record<string, boolean>>({});
  const [buddies, setBuddies] = useState<StudentProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSquad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, degree, current_subject, is_studying_now, study_streak_days')
        .order('study_streak_days', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        const studentList: StudentProfile[] = profiles.map((p) => {
          const initials = p.full_name
            ? p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            : 'ST';
          return {
            id: p.id,
            name: p.full_name || 'Anonymous Student',
            initials,
            subject: p.current_subject || p.degree || 'Study Session',
            isStudying: p.is_studying_now || false,
            streak: p.study_streak_days || 0,
          };
        });
        setBuddies(studentList);

        const lb: LeaderboardItem[] = profiles.map((p, idx) => ({
          rank: idx + 1,
          name: user && p.id === user.id ? `You (${p.full_name || 'Me'})` : (p.full_name || 'Student'),
          streak: p.study_streak_days || 0,
          isSelf: user ? p.id === user.id : false,
        }));
        setLeaderboard(lb);
      } else {
        setBuddies([]);
        setLeaderboard([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSquad();
  }, []);

  const handleCheer = (id: string) => {
    setCheered((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCheered((prev) => ({ ...prev, [id]: false }));
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSquad();
            }}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Squad & Friends</Text>
            <Text style={styles.subtitle}>Live study presence & streaks</Text>
          </View>
        </View>

        {/* Studying Now */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CAMPUS PRESENCE</Text>
          {loading ? (
            <View style={{ gap: 10 }}>
              <View style={[styles.friendCard, { opacity: 0.5 }]} />
              <View style={[styles.friendCard, { opacity: 0.5 }]} />
            </View>
          ) : buddies.length === 0 ? (
            <View style={[styles.friendCard, { paddingVertical: 24, justifyContent: 'center' }]}>
              <Text style={{ color: '#A0A0A0', fontSize: 13, textAlign: 'center' }}>
                No active students yet. As users join, they will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {buddies.map((friend) => (
                <View key={friend.id} style={styles.friendCard}>
                  <View style={styles.friendLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{friend.initials}</Text>
                      {friend.isStudying && <View style={styles.onlineDot} />}
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendStatus}>
                        {friend.isStudying
                          ? `Studying · ${friend.subject}`
                          : `Streak: ${friend.streak} day(s)`}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleCheer(friend.id)}
                    style={styles.cheerBtn}
                  >
                    {cheered[friend.id] ? (
                      <Text style={styles.cheerSentText}>Sent</Text>
                    ) : (
                      <Zap size={14} color="#A0A0A0" />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Leaderboard Card */}
        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <View style={styles.leaderboardTitleRow}>
              <Trophy size={16} color="#F59E0B" />
              <Text style={styles.leaderboardTitle}>Streak Leaderboard</Text>
            </View>
            <Text style={styles.resetLabel}>Supabase Sync</Text>
          </View>

          <View style={styles.leaderboardList}>
            {leaderboard.length === 0 && !loading ? (
              <Text style={{ color: '#71717A', fontSize: 12, paddingVertical: 12, textAlign: 'center' }}>
                No streak rankings yet.
              </Text>
            ) : (
              leaderboard.map((item) => (
                <View
                  key={item.rank}
                  style={[
                    styles.leaderboardRow,
                    item.isSelf && styles.selfRow,
                  ]}
                >
                  <View style={styles.rankCol}>
                    <Text style={styles.rankNumber}>{item.rank}.</Text>
                    <Text style={[styles.userName, item.isSelf && styles.selfName]}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={styles.hoursText}>{item.streak} days</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#71717A',
    fontSize: 13,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  joinBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  friendsList: {
    gap: 10,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  friendInfo: {
    gap: 2,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  friendStatus: {
    color: '#71717A',
    fontSize: 12,
  },
  cheerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cheerSentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  leaderboardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    gap: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaderboardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  resetLabel: {
    color: '#71717A',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  selfRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankNumber: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 16,
  },
  userName: {
    color: '#D4D4D8',
    fontSize: 13,
  },
  selfName: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hoursText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});

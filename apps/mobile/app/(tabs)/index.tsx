import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Play, Layers, Flame, AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [nextClass, setNextClass] = useState<any | null>(null);
  const [todaySessionsCount, setTodaySessionsCount] = useState<number>(0);
  const [cardsDueCount, setCardsDueCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCockpit = useCallback(async () => {
    setErrorMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      const todayDateStr = today.toISOString().split('T')[0];

      // Parallelize queries per Estavo performance standard
      const [profileRes, classesRes, sessionsRes, cardsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('timetable_classes').select('*, courses(name, code)').eq('user_id', user.id).order('start_time'),
        supabase.from('study_sessions').select('id, completed_at').eq('user_id', user.id).gte('completed_at', `${todayDateStr}T00:00:00.000Z`),
        supabase.from('flashcards').select('id, due_date').eq('user_id', user.id).lte('due_date', todayDateStr),
      ]);

      setProfile(profileRes.data || { study_streak_days: 0 });
      setTodaySessionsCount(sessionsRes.data?.length || 0);
      setCardsDueCount(cardsRes.data?.length || 0);

      // Determine next class
      const classes = classesRes.data || [];
      const todayClasses = classes.filter((c: any) => c.day_of_week === currentDayOfWeek);
      const currentTimeStr = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

      const upcoming = todayClasses.find((c: any) => (c.start_time?.slice(0, 5) || '00:00') >= currentTimeStr);
      if (upcoming) {
        setNextClass({
          name: upcoming.courses?.name || 'Class',
          code: upcoming.courses?.code || '',
          time: `Today at ${upcoming.start_time?.slice(0, 5)}`,
          venue: upcoming.venue || 'Campus Venue',
        });
      } else if (classes.length > 0) {
        const first = classes[0];
        const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setNextClass({
          name: first.courses?.name || 'Class',
          code: first.courses?.code || '',
          time: `${days[first.day_of_week]} at ${first.start_time?.slice(0, 5)}`,
          venue: first.venue || 'Campus Venue',
        });
      } else {
        setNextClass(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load cockpit data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCockpit();
  }, [fetchCockpit]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCockpit();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
            <Text style={styles.title}>{getGreeting()}</Text>
            <Text style={styles.subtitle}>Academic cockpit · today's plan</Text>
          </View>
          <View style={styles.streakPill}>
            <Flame size={16} color="#F59E0B" />
            <Text style={styles.streakText}>{profile?.study_streak_days || 0} Days</Text>
          </View>
        </View>

        {/* Error Message */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#E74C3C" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonBanner} />
            <View style={styles.grid}>
              <View style={styles.skeletonCard} />
              <View style={styles.skeletonCard} />
            </View>
          </View>
        )}

        {/* Next Up Card */}
        {!loading && (
          <View style={styles.nextUpCard}>
            <View style={styles.nextUpBadge}>
              <View style={styles.indicatorDot} />
              <Text style={styles.nextUpBadgeText}>NEXT CLASS UP</Text>
            </View>

            {nextClass ? (
              <>
                <Text style={styles.nextUpTitle}>
                  {nextClass.code} · {nextClass.name}
                </Text>
                <View style={styles.nextUpMeta}>
                  <Clock size={13} color="#A0A0A0" />
                  <Text style={styles.nextUpTime}>
                    {nextClass.time} · {nextClass.venue}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.nextUpTitle}>No classes scheduled</Text>
                <Text style={styles.nextUpSubtitle}>
                  Set up your timetable in the web cockpit to enable live class tracking.
                </Text>
              </>
            )}
          </View>
        )}

        {/* Dashboard Grid */}
        {!loading && (
          <View style={styles.grid}>
            {/* Card 1: Focus Goal */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>SESSION GOAL</Text>
              <Text style={styles.cardMetric}>{todaySessionsCount} / 4</Text>
              <Text style={styles.cardSubtext}>sessions logged today</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/timer')}
                style={styles.cardButton}
              >
                <Play size={12} color="#000000" />
                <Text style={styles.cardButtonText}>Start Focus</Text>
              </Pressable>
            </View>

            {/* Card 2: Flashcards */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>FLASHCARDS</Text>
              <Text style={styles.cardMetric}>{cardsDueCount}</Text>
              <Text style={styles.cardSubtext}>due for review (SM-2)</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/cards')}
                style={styles.cardButton}
              >
                <Layers size={12} color="#000000" />
                <Text style={styles.cardButtonText}>Review Now</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    flex: 1,
  },
  skeletonContainer: {
    gap: 16,
  },
  skeletonBanner: {
    height: 120,
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  skeletonCard: {
    flex: 1,
    height: 140,
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  nextUpCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    marginBottom: 20,
  },
  nextUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  nextUpBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#A0A0A0',
  },
  nextUpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  nextUpSubtitle: {
    fontSize: 12,
    color: '#A0A0A0',
    lineHeight: 18,
  },
  nextUpMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextUpTime: {
    fontSize: 13,
    color: '#A0A0A0',
    fontFamily: 'monospace',
  },
  grid: {
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#A0A0A0',
  },
  cardMetric: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  cardSubtext: {
    fontSize: 11,
    color: '#4A4A4A',
    marginBottom: 12,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
  },
  cardButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
});

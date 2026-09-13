import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function TimerScreen() {
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; code: string; name: string } | null>(null);

  // Load user's first course if available
  useEffect(() => {
    async function loadCourse() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: courses } = await supabase
        .from('courses')
        .select('id, code, name')
        .eq('user_id', user.id)
        .limit(1);
      if (courses && courses.length > 0) {
        setSelectedCourse(courses[0]);
      }
    }
    loadCourse();
  }, []);

  const handleSessionComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Record study session
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          course_id: selectedCourse?.id || null,
          duration_seconds: 45 * 60,
          mode: 'focus',
          completed_at: new Date().toISOString(),
        });

        // Increment study streak & mark last study date
        const today = new Date().toISOString().split('T')[0];
        const { data: profile } = await supabase
          .from('profiles')
          .select('study_streak_days, last_study_date, longest_streak_days')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          const isNewDay = profile.last_study_date !== today;
          const newStreak = isNewDay ? (profile.study_streak_days || 0) + 1 : (profile.study_streak_days || 1);
          const longest = Math.max(newStreak, profile.longest_streak_days || 0);

          await supabase
            .from('profiles')
            .update({
              study_streak_days: newStreak,
              longest_streak_days: longest,
              last_study_date: today,
              is_studying_now: false,
            })
            .eq('id', user.id);
        }
      }
      Alert.alert('Session Saved', '45 minutes focus recorded to your Saktus study log.');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleSessionComplete();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Course Header */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {selectedCourse ? `${selectedCourse.code} · ${selectedCourse.name}` : 'General Focus · Saktus'}
          </Text>
        </View>

        {/* Clock Face */}
        <View style={styles.clockContainer}>
          <Text style={styles.timerText}>{timeStr}</Text>
          <Text style={styles.quoteText}>"stay locked in."</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={() => setIsRunning(!isRunning)}
            style={styles.playButton}
          >
            {isRunning ? (
              <Pause size={24} color="#000000" fill="#000000" />
            ) : (
              <Play size={24} color="#000000" fill="#000000" style={{ marginLeft: 2 }} />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setIsRunning(false);
              setTimeLeft(45 * 60);
            }}
            style={styles.resetButton}
          >
            <RotateCcw size={20} color="#71717A" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 36,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '600',
  },
  clockContainer: {
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 76,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  quoteText: {
    color: '#71717A',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

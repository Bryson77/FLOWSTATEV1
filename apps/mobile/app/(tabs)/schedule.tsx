import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MapPin, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const DAYS = [
  { num: 1, label: 'Mon' },
  { num: 2, label: 'Tue' },
  { num: 3, label: 'Wed' },
  { num: 4, label: 'Thu' },
  { num: 5, label: 'Fri' },
];

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setErrorMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setClasses([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('timetable_classes')
        .select('*, courses(name, code, color)')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  const dayClasses = classes.filter((c) => c.day_of_week === selectedDay);

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
            <Text style={styles.title}>Timetable</Text>
            <Text style={styles.subtitle}>Weekly class & lab matrix</Text>
          </View>
        </View>

        {/* Day Selector Pills */}
        <View style={styles.daysRow}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.num;
            return (
              <Pressable
                key={day.num}
                onPress={() => setSelectedDay(day.num)}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Error State */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#E74C3C" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </View>
        )}

        {/* Empty State */}
        {!loading && dayClasses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No classes scheduled</Text>
            <Text style={styles.emptySubtitle}>
              You have no classes for this day. Add classes from the web cockpit to populate your matrix.
            </Text>
          </View>
        )}

        {/* Classes List */}
        {!loading && dayClasses.length > 0 && (
          <View style={styles.classesList}>
            {dayClasses.map((item) => (
              <View key={item.id} style={styles.classCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {(item.class_type || 'Lecture').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.codeText}>{item.courses?.code}</Text>
                </View>

                <Text style={styles.subjectName}>{item.courses?.name || 'Class'}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={13} color="#71717A" />
                    <Text style={styles.metaText}>
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </Text>
                  </View>
                  {item.venue && (
                    <View style={styles.metaItem}>
                      <MapPin size={13} color="#71717A" />
                      <Text style={styles.metaText}>{item.venue}</Text>
                    </View>
                  )}
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
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
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
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0A0A0',
  },
  dayTextActive: {
    color: '#000000',
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
    gap: 12,
  },
  skeletonCard: {
    height: 110,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  emptyContainer: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 20,
  },
  classesList: {
    gap: 12,
  },
  classCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#A0A0A0',
    fontSize: 12,
  },
});

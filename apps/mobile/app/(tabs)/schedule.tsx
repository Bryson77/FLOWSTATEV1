import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MapPin, Plus } from 'lucide-react-native';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const CLASSES = [
  {
    id: '1',
    code: 'CSC2001F',
    name: 'Computer Science',
    time: '09:00 - 10:30',
    venue: 'Science Block LT2',
    day: 0,
    type: 'Lecture',
  },
  {
    id: '2',
    code: 'MTH2000S',
    name: 'Linear Algebra',
    time: '11:00 - 12:30',
    venue: 'Maths Building Room 4',
    day: 1,
    type: 'Lecture',
  },
  {
    id: '3',
    code: 'CSC2001F',
    name: 'Algorithms Lab',
    time: '14:00 - 16:00',
    venue: 'Computer Lab 3',
    day: 3,
    type: 'Lab',
  },
];

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(0);

  const dayClasses = CLASSES.filter((c) => c.day === selectedDay);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Timetable</Text>
            <Text style={styles.subtitle}>Weekly class & lab matrix</Text>
          </View>
        </View>

        {/* Day Selector Pills */}
        <View style={styles.daysRow}>
          {DAYS.map((day, idx) => (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(idx)}
              style={[
                styles.dayPill,
                selectedDay === idx && styles.dayPillActive,
              ]}
            >
              <Text
                style={[
                  styles.dayPillText,
                  selectedDay === idx && styles.dayPillTextActive,
                ]}
              >
                {day}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Class Cards List */}
        <View style={styles.classesList}>
          {dayClasses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No classes scheduled for this day</Text>
            </View>
          ) : (
            dayClasses.map((item) => (
              <View key={item.id} style={styles.classCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.codeText}>{item.code}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={styles.className}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={13} color="#71717A" />
                    <Text style={styles.metaText}>{item.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={13} color="#71717A" />
                    <Text style={styles.metaText}>{item.venue}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  dayPillText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  dayPillTextActive: {
    color: '#000000',
  },
  classesList: {
    gap: 12,
  },
  classCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#D4D4D8',
    fontSize: 10,
    fontWeight: '500',
  },
  className: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  metaRow: {
    gap: 6,
    marginTop: 4,
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
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  emptyText: {
    color: '#52525B',
    fontSize: 13,
  },
});

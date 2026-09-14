import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  CheckSquare,
  FileText,
  Clock,
  ArrowLeft,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

type AttachmentType = 'course' | 'task' | 'assessment' | 'general';

interface AttachmentItem {
  id: string;
  title: string;
  subtitle?: string;
  type: AttachmentType;
}

const DURATIONS = [
  { label: '15m', sec: 15 * 60 },
  { label: '25m', sec: 25 * 60 },
  { label: '45m', sec: 45 * 60 },
  { label: '60m', sec: 60 * 60 },
];

export default function TimerScreen() {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Attachment state
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('course');
  const [selectedItem, setSelectedItem] = useState<AttachmentItem | null>(null);
  const [availableCourses, setAvailableCourses] = useState<AttachmentItem[]>([]);
  const [availableTasks, setAvailableTasks] = useState<AttachmentItem[]>([]);
  const [availableAssessments, setAvailableAssessments] = useState<AttachmentItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Time worked stats
  const [timeWorkedSeconds, setTimeWorkedSeconds] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

  // Load items to attach
  const loadAttachableItems = useCallback(async () => {
    if (!user) return;

    try {
      const [coursesRes, tasksRes, assessmentsRes] = await Promise.all([
        supabase.from('courses').select('id, name, code').eq('user_id', user.id).order('name'),
        supabase
          .from('tasks')
          .select('id, text, prio')
          .eq('user_id', user.id)
          .eq('done', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('assessments')
          .select('id, title, due_date')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('due_date', { ascending: true }),
      ]);

      const cItems: AttachmentItem[] = (coursesRes.data || []).map((c: any) => ({
        id: c.id,
        title: `${c.code ? c.code + ' · ' : ''}${c.name}`,
        subtitle: 'Course',
        type: 'course',
      }));
      setAvailableCourses(cItems);

      const tItems: AttachmentItem[] = (tasksRes.data || []).map((t: any) => ({
        id: t.id,
        title: t.text,
        subtitle: 'Task',
        type: 'task',
      }));
      setAvailableTasks(tItems);

      const aItems: AttachmentItem[] = (assessmentsRes.data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        subtitle: `Due ${new Date(a.due_date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`,
        type: 'assessment',
      }));
      setAvailableAssessments(aItems);

      // Default to first course if available
      if (cItems.length > 0 && !selectedItem) {
        setSelectedItem(cItems[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user, selectedItem]);

  useEffect(() => {
    loadAttachableItems();
  }, [loadAttachableItems]);

  // Query time worked for the currently selected item
  const fetchTimeWorked = useCallback(async () => {
    if (!user || !selectedItem || selectedItem.type === 'general') {
      setTimeWorkedSeconds(0);
      setSessionsCount(0);
      return;
    }

    try {
      let query = supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id);

      if (selectedItem.type === 'course') {
        query = query.eq('course_id', selectedItem.id);
      } else if (selectedItem.type === 'task') {
        query = query.eq('task_id', selectedItem.id);
      } else if (selectedItem.type === 'assessment') {
        query = query.eq('assessment_id', selectedItem.id);
      }

      const { data } = await query;
      if (data) {
        const total = data.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
        setTimeWorkedSeconds(total);
        setSessionsCount(data.length);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user, selectedItem]);

  useEffect(() => {
    fetchTimeWorked();
  }, [fetchTimeWorked]);

  // Session completion handler
  const handleSessionComplete = async () => {
    if (!user) return;

    try {
      const sessionSeconds = selectedDuration;

      const courseId = selectedItem?.type === 'course' ? selectedItem.id : null;
      const taskId = selectedItem?.type === 'task' ? selectedItem.id : null;
      const assessmentId = selectedItem?.type === 'assessment' ? selectedItem.id : null;

      // Log session
      await supabase.from('study_sessions').insert({
        user_id: user.id,
        course_id: courseId,
        task_id: taskId,
        assessment_id: assessmentId,
        duration_seconds: sessionSeconds,
        mode: 'pomodoro',
        completed_at: new Date().toISOString(),
      });

      // Update streaks
      const today = new Date().toISOString().split('T')[0];
      const { data: profile } = await supabase
        .from('profiles')
        .select('study_streak_days, last_study_date, longest_streak_days')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const isNewDay = profile.last_study_date !== today;
        const newStreak = isNewDay
          ? (profile.study_streak_days || 0) + 1
          : profile.study_streak_days || 1;
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

      // Refresh stats
      fetchTimeWorked();

      // If attached to a task, offer 1-tap completion
      if (selectedItem?.type === 'task') {
        Alert.alert(
          'Session Complete',
          `Logged ${Math.floor(sessionSeconds / 60)} minutes. Did you finish this task?`,
          [
            { text: 'Keep In Progress', style: 'cancel' },
            {
              text: 'Mark Done',
              onPress: async () => {
                await supabase.from('tasks').update({ done: true }).eq('id', selectedItem.id);
                loadAttachableItems();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Session Recorded',
          `Logged ${Math.floor(sessionSeconds / 60)} minutes to ${
            selectedItem?.title || 'General Focus'
          }.`
        );
      }
    } catch (e) {
      console.error('Error logging session:', e);
      Alert.alert('Notice', 'Unable to save study session. Something went wrong.');
    }
  };

  // Timer interval
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev: number) => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleSessionComplete();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(selectedDuration);
  };

  const selectDuration = (sec: number) => {
    if (isRunning) return;
    setSelectedDuration(sec);
    setTimeLeft(sec);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const formatHoursMinutes = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const currentAttachList =
    attachmentType === 'course'
      ? availableCourses
      : attachmentType === 'task'
      ? availableTasks
      : availableAssessments;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topNavTitle}>Focus Timer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Attachment Selector Card */}
        <View style={styles.attachmentCard}>
          <Text style={styles.cardHeaderLabel}>ATTACH TO SESSION</Text>

          {/* Type Tabs */}
          <View style={styles.typeTabs}>
            <Pressable
              style={[styles.typeTab, attachmentType === 'course' && styles.typeTabActive]}
              onPress={() => {
                setAttachmentType('course');
                setSelectedItem(availableCourses[0] || null);
              }}
            >
              <BookOpen
                size={14}
                color={attachmentType === 'course' ? '#000000' : '#71717A'}
              />
              <Text
                style={[
                  styles.typeTabText,
                  attachmentType === 'course' && styles.typeTabTextActive,
                ]}
              >
                Course
              </Text>
            </Pressable>

            <Pressable
              style={[styles.typeTab, attachmentType === 'task' && styles.typeTabActive]}
              onPress={() => {
                setAttachmentType('task');
                setSelectedItem(availableTasks[0] || null);
              }}
            >
              <CheckSquare
                size={14}
                color={attachmentType === 'task' ? '#000000' : '#71717A'}
              />
              <Text
                style={[
                  styles.typeTabText,
                  attachmentType === 'task' && styles.typeTabTextActive,
                ]}
              >
                Task
              </Text>
            </Pressable>

            <Pressable
              style={[styles.typeTab, attachmentType === 'assessment' && styles.typeTabActive]}
              onPress={() => {
                setAttachmentType('assessment');
                setSelectedItem(availableAssessments[0] || null);
              }}
            >
              <FileText
                size={14}
                color={attachmentType === 'assessment' ? '#000000' : '#71717A'}
              />
              <Text
                style={[
                  styles.typeTabText,
                  attachmentType === 'assessment' && styles.typeTabTextActive,
                ]}
              >
                Assignment
              </Text>
            </Pressable>
          </View>

          {/* Current Selection Dropdown Trigger */}
          <Pressable style={styles.selectionDropdown} onPress={() => setIsPickerOpen(true)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectionTitle} numberOfLines={1}>
                {selectedItem?.title || `No ${attachmentType} selected`}
              </Text>
              <Text style={styles.selectionSubtitle}>Tap to change attachment</Text>
            </View>
            <ChevronDown size={16} color="#71717A" />
          </Pressable>

          {/* Time Worked on this Item HUD */}
          {selectedItem && (
            <View style={styles.timeWorkedBox}>
              <Clock size={14} color="#10B981" />
              <Text style={styles.timeWorkedText}>
                Logged on this {attachmentType}:{' '}
                <Text style={styles.timeWorkedHighlight}>
                  {formatHoursMinutes(timeWorkedSeconds)}
                </Text>{' '}
                ({sessionsCount} sessions)
              </Text>
            </View>
          )}
        </View>

        {/* Duration Selectors */}
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const isSel = selectedDuration === d.sec;
            return (
              <Pressable
                key={d.label}
                onPress={() => selectDuration(d.sec)}
                style={[styles.durationPill, isSel && styles.durationPillActive]}
              >
                <Text style={[styles.durationText, isSel && styles.durationTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Clock Face Display */}
        <View style={styles.clockContainer}>
          <Text style={styles.timeText}>{timeStr}</Text>
          <Text style={styles.statusLabel}>
            {isRunning ? 'STUDYING NOW' : 'READY TO FOCUS'}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={toggleTimer}
            style={({ pressed }: { pressed: boolean }) => [styles.playBtn, pressed && styles.pressed]}
          >
            {isRunning ? (
              <Pause size={24} color="#000000" />
            ) : (
              <Play size={24} color="#000000" />
            )}
            <Text style={styles.playBtnText}>{isRunning ? 'Pause' : 'Start Focus'}</Text>
          </Pressable>

          <Pressable
            onPress={resetTimer}
            style={({ pressed }: { pressed: boolean }) => [styles.resetBtn, pressed && styles.pressed]}
          >
            <RotateCcw size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Select Item Modal */}
      <Modal visible={isPickerOpen} animationType="slide" transparent onRequestClose={() => setIsPickerOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {attachmentType}</Text>
              <Pressable onPress={() => setIsPickerOpen(false)} hitSlop={8}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {currentAttachList.length === 0 ? (
                <Text style={styles.modalEmptyText}>
                  No active {attachmentType}s found. Add one from your dashboard.
                </Text>
              ) : (
                currentAttachList.map((item: AttachmentItem) => {
                  const isSel = selectedItem?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.modalItemRow, isSel && styles.modalItemRowActive]}
                      onPress={() => {
                        setSelectedItem(item);
                        setIsPickerOpen(false);
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <Text style={styles.modalItemTitle} numberOfLines={1}>{item.title}</Text>
                        {item.subtitle && (
                          <Text style={styles.modalItemSub} numberOfLines={1}>{item.subtitle}</Text>
                        )}
                      </View>
                      {isSel && <Check size={16} color="#FFFFFF" />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  topNavTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  attachmentCard: {
    width: '100%',
    backgroundColor: '#09090B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  cardHeaderLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 3,
    gap: 4,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  typeTabActive: { backgroundColor: '#FFFFFF' },
  typeTabText: { color: '#71717A', fontSize: 11, fontWeight: '600' },
  typeTabTextActive: { color: '#000000', fontWeight: '700' },
  selectionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  selectionSubtitle: { color: '#71717A', fontSize: 11, marginTop: 2 },
  timeWorkedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeWorkedText: { color: '#A1A1AA', fontSize: 11 },
  timeWorkedHighlight: { color: '#10B981', fontWeight: '700' },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  durationPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  durationText: { color: '#71717A', fontSize: 12, fontWeight: '600' },
  durationTextActive: { color: '#000000', fontWeight: '800' },
  clockContainer: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 6,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 68,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  statusLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  playBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.97 }] },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#09090B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    maxHeight: '80%',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  modalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalEmptyText: {
    color: '#71717A',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemRowActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  modalItemTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  modalItemSub: { color: '#71717A', fontSize: 11, marginTop: 2 },
});

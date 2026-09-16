import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useMobileTimer, type AttachmentItem, type AttachmentType } from '../../lib/timer-context';
import { useThemeColors, type ThemeColors } from '../../lib/theme';

const DURATIONS = [
  { label: '15m', sec: 15 * 60 },
  { label: '25m', sec: 25 * 60 },
  { label: '45m', sec: 45 * 60 },
  { label: '60m', sec: 60 * 60 },
];

export default function TimerScreen() {
  const { user } = useAuth();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    selectedDuration,
    timeLeft,
    isRunning,
    selectedItem,
    toggleTimer,
    resetTimer,
    selectDuration,
    setSelectedItem,
    timeStr,
  } = useMobileTimer();

  // Attachment state
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('course');
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
      console.error('Error loading attachable items:', e);
    }
  }, [user, selectedItem, setSelectedItem]);

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
      console.error('Error fetching time worked:', e);
    }
  }, [user, selectedItem]);

  useEffect(() => {
    fetchTimeWorked();
  }, [fetchTimeWorked]);

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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Focus Timer</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Context Attachment Selector Card */}
        <View style={styles.attachmentCard}>
          <Text style={styles.cardHeaderLabel}>FOCUS ATTACHMENT</Text>

          {/* Type Segmented Buttons */}
          <View style={styles.typeTabs}>
            <Pressable
              style={[styles.typeTab, attachmentType === 'course' && styles.typeTabActive]}
              onPress={() => setAttachmentType('course')}
            >
              <BookOpen size={13} color={attachmentType === 'course' ? theme.buttonPrimaryText : theme.textMuted} />
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
              onPress={() => setAttachmentType('task')}
            >
              <CheckSquare size={13} color={attachmentType === 'task' ? theme.buttonPrimaryText : theme.textMuted} />
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
              onPress={() => setAttachmentType('assessment')}
            >
              <FileText size={13} color={attachmentType === 'assessment' ? theme.buttonPrimaryText : theme.textMuted} />
              <Text
                style={[
                  styles.typeTabText,
                  attachmentType === 'assessment' && styles.typeTabTextActive,
                ]}
              >
                Exam
              </Text>
            </Pressable>
          </View>

          {/* Selected Item Dropdown Button */}
          <Pressable
            style={({ pressed }) => [styles.selectionDropdown, pressed && styles.pressed]}
            onPress={() => setIsPickerOpen(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.selectionTitle} numberOfLines={1}>
                {selectedItem ? selectedItem.title : `Select a ${attachmentType}`}
              </Text>
              {selectedItem?.subtitle && (
                <Text style={styles.selectionSubtitle}>{selectedItem.subtitle}</Text>
              )}
            </View>
            <ChevronDown size={16} color={theme.textMuted} />
          </Pressable>

          {/* Time Worked on this item banner */}
          {selectedItem && (
            <View style={styles.timeWorkedBox}>
              <Clock size={13} color="#10B981" />
              <Text style={styles.timeWorkedText}>
                Total logged:{' '}
                <Text style={styles.timeWorkedHighlight}>
                  {Math.floor(timeWorkedSeconds / 3600)}h {Math.floor((timeWorkedSeconds % 3600) / 60)}m
                </Text>{' '}
                across {sessionsCount} session{sessionsCount === 1 ? '' : 's'}
              </Text>
            </View>
          )}
        </View>

        {/* Duration Selection Pills */}
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const isSelected = selectedDuration === d.sec;
            return (
              <Pressable
                key={d.label}
                style={[styles.durationPill, isSelected && styles.durationPillActive]}
                onPress={() => selectDuration(d.sec)}
              >
                <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Main Clock Face */}
        <View style={styles.clockContainer}>
          <Text style={styles.timeText}>{timeStr}</Text>
          <Text style={styles.statusLabel}>
            {isRunning ? 'FOCUS SESSION ACTIVE' : 'READY TO FOCUS'}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
            onPress={toggleTimer}
          >
            {isRunning ? (
              <Pause size={18} color={theme.buttonPrimaryText} />
            ) : (
              <Play size={18} color={theme.buttonPrimaryText} />
            )}
            <Text style={styles.playBtnText}>{isRunning ? 'Pause' : 'Start Focus'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
            onPress={resetTimer}
            hitSlop={8}
          >
            <RotateCcw size={18} color={theme.textPrimary} />
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
                      {isSel && <Check size={16} color={theme.textPrimary} />}
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

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    topNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    backBtn: { padding: 4 },
    topNavTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
      alignItems: 'center',
    },
    attachmentCard: {
      width: '100%',
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      gap: 12,
      marginBottom: 24,
    },
    cardHeaderLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    typeTabs: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
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
    typeTabActive: { backgroundColor: theme.buttonPrimaryBg },
    typeTabText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    typeTabTextActive: { color: theme.buttonPrimaryText, fontWeight: '700' },
    selectionDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selectionTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    selectionSubtitle: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
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
    timeWorkedText: { color: theme.textSecondary, fontSize: 11 },
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
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    durationPillActive: {
      backgroundColor: theme.buttonPrimaryBg,
      borderColor: theme.buttonPrimaryBg,
    },
    durationText: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    durationTextActive: { color: theme.buttonPrimaryText, fontWeight: '800' },
    clockContainer: {
      alignItems: 'center',
      marginBottom: 40,
      gap: 6,
    },
    timeText: {
      color: theme.textPrimary,
      fontSize: 68,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: -2,
    },
    statusLabel: {
      color: theme.textMuted,
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
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 24,
    },
    playBtnText: { color: theme.buttonPrimaryText, fontSize: 15, fontWeight: '700' },
    resetBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { transform: [{ scale: 0.97 }] },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      maxHeight: '80%',
      gap: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
    modalCloseText: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
    modalEmptyText: {
      color: theme.textMuted,
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
    modalItemRowActive: { backgroundColor: theme.surfaceHover },
    modalItemTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    modalItemSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  });
}

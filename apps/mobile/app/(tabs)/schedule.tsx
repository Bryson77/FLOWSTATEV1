import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  MapPin,
  AlertCircle,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Check,
  X,
  FileText,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { getSafeErrorMessage } from '../../lib/errors';
import { getLocalISODate } from '@saktus/study-engine';
import { useThemeColors, type ThemeColors } from '../../lib/theme';

const DAYS = [
  { num: 1, label: 'Mon' },
  { num: 2, label: 'Tue' },
  { num: 3, label: 'Wed' },
  { num: 4, label: 'Thu' },
  { num: 5, label: 'Fri' },
  { num: 6, label: 'Sat' },
  { num: 7, label: 'Sun' },
];

export default function ScheduleScreen() {
  const { user } = useAuth();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  });

  const [classes, setClasses] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemType, setItemType] = useState<'class' | 'assessment'>('class');
  const [formTitle, setFormTitle] = useState('');
  const [formCourseId, setFormCourseId] = useState<string>('');
  const [formDay, setFormDay] = useState(selectedDay);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:30');
  const [formVenue, setFormVenue] = useState('');
  const [formDueDate, setFormDueDate] = useState(() => getLocalISODate());
  const [formWeight, setFormWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchScheduleData = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!user) {
        setClasses([]);
        setAssessments([]);
        setLoading(false);
        return;
      }

      const [classesRes, assessmentsRes, coursesRes] = await Promise.all([
        supabase
          .from('timetable_classes')
          .select('*, courses(name, code, color)')
          .eq('user_id', user.id)
          .order('start_time', { ascending: true }),
        supabase
          .from('assessments')
          .select('*, courses(name, code)')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true }),
        supabase.from('courses').select('id, name, code').eq('user_id', user.id).order('name'),
      ]);

      if (classesRes.error) throw classesRes.error;
      setClasses(classesRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err: any) {
      console.error('Schedule fetch error:', err);
      setErrorMsg(getSafeErrorMessage(err, 'Failed to load schedule. Something went wrong.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScheduleData();
  };

  const handleAddItem = async () => {
    if (!user) return;
    setSaving(true);
    setModalError('');

    try {
      if (itemType === 'class') {
        if (!formTitle.trim()) {
          setModalError('Fill this in: Please enter a class or study session name.');
          setSaving(false);
          return;
        }

        const { error } = await supabase.from('timetable_classes').insert({
          user_id: user.id,
          course_id: formCourseId || null,
          day_of_week: formDay,
          start_time: formStartTime.trim() || '09:00',
          end_time: formEndTime.trim() || '10:30',
          venue: formVenue.trim() || 'Campus / Room',
          class_type: 'lecture',
        } as any);

        if (error) throw error;
      } else {
        // Assessment
        if (!formTitle.trim()) {
          setModalError('Fill this in: Please enter an assessment title.');
          setSaving(false);
          return;
        }

        const weight = formWeight ? parseFloat(formWeight) : null;

        const { error } = await supabase.from('assessments').insert({
          user_id: user.id,
          course_id: formCourseId || null,
          title: formTitle.trim(),
          due_date: formDueDate,
          weight_percentage: weight,
          completed: false,
          type: 'assignment',
        } as any);

        if (error) throw error;
      }

      setIsAddModalOpen(false);
      setFormTitle('');
      setFormVenue('');
      setFormWeight('');
      await fetchScheduleData();
    } catch (err: any) {
      console.error('Schedule save error:', err);
      setModalError(getSafeErrorMessage(err, 'Failed to save item. Something went wrong.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    Alert.alert('Delete Class', 'Are you sure you want to remove this from your schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setClasses((prev: any[]) => prev.filter((c: any) => c.id !== id));
          try {
            await supabase.from('timetable_classes').delete().eq('id', id);
          } catch {
            fetchScheduleData();
          }
        },
      },
    ]);
  };

  const handleDeleteAssessment = async (id: string) => {
    Alert.alert('Delete Assessment', 'Remove this assessment from your schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAssessments((prev: any[]) => prev.filter((a: any) => a.id !== id));
          try {
            await supabase.from('assessments').delete().eq('id', id);
          } catch {
            fetchScheduleData();
          }
        },
      },
    ]);
  };

  const dayClasses = classes.filter((c: any) => c.day_of_week === selectedDay);

  // Check which days have classes or events for dot indicators
  const daysWithClasses = new Set(classes.map((c: any) => c.day_of_week));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Header with "+ Add to Schedule" */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Calendar & Schedule</Text>
            <Text style={styles.subtitle}>Full 7-day timetable and assessment tracker</Text>
          </View>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.addButton, pressed && styles.pressed]}
            onPress={() => {
              setFormDay(selectedDay);
              setModalError('');
              setIsAddModalOpen(true);
            }}
          >
            <Plus size={16} color="#000000" />
            <Text style={styles.addButtonText}>Add Event</Text>
          </Pressable>
        </View>

        {/* Full 7-Day Selector Pills (Mon - Sun) */}
        <View style={styles.daysRow}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.num;
            const hasEvents = daysWithClasses.has(day.num);

            return (
              <Pressable
                key={day.num}
                onPress={() => setSelectedDay(day.num)}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                  {day.label}
                </Text>
                {hasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotActive]} />}
              </Pressable>
            );
          })}
        </View>

        {/* Error Notice */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Selected Day's Classes & Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {DAYS.find((d) => d.num === selectedDay)?.label} Timetable ({dayClasses.length})
            </Text>
          </View>

          {dayClasses.length === 0 ? (
            <View style={styles.emptyCard}>
              <CalendarIcon size={28} color="#52525B" />
              <Text style={styles.emptyTitle}>Nothing scheduled for this day</Text>
              <Text style={styles.emptySub}>
                Tap "Add Event" to log a lecture, study group, or revision block.
              </Text>
            </View>
          ) : (
            dayClasses.map((item: any) => (
              <View key={item.id} style={styles.classCard}>
                <View style={styles.classLeft}>
                  <View style={styles.colorBar} />
                  <View style={styles.classInfo}>
                    <Text style={styles.className} numberOfLines={1}>
                      {item.courses?.name || 'Scheduled Class / Study Block'}
                    </Text>
                    {item.courses?.code ? (
                      <Text style={styles.courseCode} numberOfLines={1}>{item.courses.code}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Clock size={12} color="#71717A" />
                        <Text style={styles.metaText}>
                          {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                        </Text>
                      </View>
                      {item.venue ? (
                        <View style={[styles.metaItem, { flex: 1, minWidth: 0 }]}>
                          <MapPin size={12} color="#71717A" />
                          <Text style={styles.metaText} numberOfLines={1}>{item.venue}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleDeleteClass(item.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={15} color="#52525B" />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Upcoming Assessments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assessments & Exam Deadlines</Text>
          </View>

          {assessments.length === 0 ? (
            <View style={styles.emptyCard}>
              <FileText size={24} color="#52525B" />
              <Text style={styles.emptyTitle}>No upcoming deadlines</Text>
              <Text style={styles.emptySub}>Add assignments or exams to see countdowns.</Text>
            </View>
          ) : (
            assessments.map((a: any) => (
              <View key={a.id} style={styles.assessmentCard}>
                <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <Text style={styles.assessmentTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.assessmentMeta} numberOfLines={1}>
                    {new Date(a.due_date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {a.weight_percentage ? ` · ${a.weight_percentage}% weighting` : ''}
                    {a.courses?.code ? ` · ${a.courses.code}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteAssessment(a.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={15} color="#52525B" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent onRequestClose={() => setIsAddModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add to Schedule</Text>
                <Pressable onPress={() => setIsAddModalOpen(false)} hitSlop={8}>
                  <X size={20} color="#71717A" />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Type Selector Tabs */}
                <View style={styles.modalTypeRow}>
                  <Pressable
                    style={[styles.modalTypeBtn, itemType === 'class' && styles.modalTypeBtnActive]}
                    onPress={() => setItemType('class')}
                  >
                    <Text
                      style={[styles.modalTypeText, itemType === 'class' && styles.modalTypeTextActive]}
                    >
                      Class / Session
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalTypeBtn,
                      itemType === 'assessment' && styles.modalTypeBtnActive,
                    ]}
                    onPress={() => setItemType('assessment')}
                  >
                    <Text
                      style={[
                        styles.modalTypeText,
                        itemType === 'assessment' && styles.modalTypeTextActive,
                      ]}
                    >
                      Assessment / Exam
                    </Text>
                  </Pressable>
                </View>

                {modalError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{modalError}</Text>
                  </View>
                ) : null}

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>
                    {itemType === 'class' ? 'CLASS OR SUBJECT NAME' : 'ASSESSMENT TITLE'}
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={
                      itemType === 'class' ? 'e.g. Mathematics Lecture' : 'e.g. Midterm Test'
                    }
                    placeholderTextColor="#52525B"
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />
                </View>

                {courses.length > 0 && (
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>COURSE (OPTIONAL)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {courses.map((c: any) => (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.courseChip,
                            formCourseId === c.id && styles.courseChipActive,
                          ]}
                          onPress={() => setFormCourseId(formCourseId === c.id ? '' : c.id)}
                        >
                          <Text
                            style={[
                              styles.courseChipText,
                              formCourseId === c.id && styles.courseChipTextActive,
                            ]}
                          >
                            {c.code || c.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {itemType === 'class' ? (
                  <>
                    <View style={styles.modalField}>
                      <Text style={styles.modalLabel}>DAY OF THE WEEK</Text>
                      <View style={styles.modalDaysRow}>
                        {DAYS.map((d) => (
                          <Pressable
                            key={d.num}
                            style={[styles.modalDayBtn, formDay === d.num && styles.modalDayBtnActive]}
                            onPress={() => setFormDay(d.num)}
                          >
                            <Text
                              style={[
                                styles.modalDayText,
                                formDay === d.num && styles.modalDayTextActive,
                              ]}
                            >
                              {d.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View style={styles.modalRow2}>
                      <View style={[styles.modalField, { flex: 1 }]}>
                        <Text style={styles.modalLabel}>START TIME</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="09:00"
                          placeholderTextColor="#52525B"
                          value={formStartTime}
                          onChangeText={setFormStartTime}
                        />
                      </View>
                      <View style={[styles.modalField, { flex: 1 }]}>
                        <Text style={styles.modalLabel}>END TIME</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="10:30"
                          placeholderTextColor="#52525B"
                          value={formEndTime}
                          onChangeText={setFormEndTime}
                        />
                      </View>
                    </View>

                    <View style={styles.modalField}>
                      <Text style={styles.modalLabel}>VENUE / ROOM / LINK</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Room 302, Science Block"
                        placeholderTextColor="#52525B"
                        value={formVenue}
                        onChangeText={setFormVenue}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalField}>
                      <Text style={styles.modalLabel}>DUE DATE (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="2026-09-25"
                        placeholderTextColor="#52525B"
                        value={formDueDate}
                        onChangeText={setFormDueDate}
                      />
                    </View>

                    <View style={styles.modalField}>
                      <Text style={styles.modalLabel}>WEIGHT PERCENTAGE (%)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. 20"
                        placeholderTextColor="#52525B"
                        value={formWeight}
                        onChangeText={setFormWeight}
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}

                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.saveBtn, pressed && styles.pressed]}
                  onPress={handleAddItem}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View style={styles.saveBtnRow}>
                      <Check size={16} color="#000000" />
                      <Text style={styles.saveBtnText}>Save to Calendar</Text>
                    </View>
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
    title: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, letterSpacing: -0.4 },
    subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    addButtonText: { color: theme.buttonPrimaryText, fontSize: 12, fontWeight: '700' },
    pressed: { transform: [{ scale: 0.97 }] },
    daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 4,
      marginBottom: 20,
    },
    dayPill: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      gap: 3,
    },
    dayPillActive: { backgroundColor: theme.buttonPrimaryBg },
    dayText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    dayTextActive: { color: theme.buttonPrimaryText, fontWeight: '800' },
    eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.textMuted },
    eventDotActive: { backgroundColor: theme.buttonPrimaryText },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.2)',
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
    },
    errorText: { color: '#EF4444', fontSize: 12 },
    section: { marginBottom: 22 },
    sectionHeader: { marginBottom: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 6,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surfaceSubtle,
    },
    emptyTitle: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    emptySub: { color: theme.textMuted, fontSize: 11, textAlign: 'center', maxWidth: 260 },
    classCard: {
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
    classLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
    colorBar: { width: 3, height: 36, borderRadius: 2, backgroundColor: theme.buttonPrimaryBg },
    classInfo: { flex: 1, minWidth: 0, gap: 2 },
    className: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    courseCode: { color: theme.textSecondary, fontSize: 11, fontWeight: '500' },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: theme.textMuted, fontSize: 11 },
    deleteBtn: { padding: 6 },
    assessmentCard: {
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
    assessmentTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
    assessmentMeta: { color: theme.textMuted, fontSize: 11, marginTop: 3 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
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
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
    modalTypeRow: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 3,
    },
    modalTypeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 9,
    },
    modalTypeBtnActive: { backgroundColor: theme.buttonPrimaryBg },
    modalTypeText: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    modalTypeTextActive: { color: theme.buttonPrimaryText, fontWeight: '700' },
    modalErrorBox: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: 8,
      padding: 8,
    },
    modalErrorText: { color: '#EF4444', fontSize: 11 },
    modalField: { gap: 6 },
    modalLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
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
    courseChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 6,
    },
    courseChipActive: { backgroundColor: theme.buttonPrimaryBg, borderColor: theme.buttonPrimaryBg },
    courseChipText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    courseChipTextActive: { color: theme.buttonPrimaryText, fontWeight: '700' },
    modalDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
    },
    modalDayBtn: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      backgroundColor: theme.surfaceSubtle,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalDayBtnActive: {
      backgroundColor: theme.buttonPrimaryBg,
      borderColor: theme.buttonPrimaryBg,
    },
    modalDayText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    modalDayTextActive: { color: theme.buttonPrimaryText, fontWeight: '800' },
    modalRow2: { flexDirection: 'row', gap: 10 },
    saveBtn: {
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    saveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    saveBtnText: { color: theme.buttonPrimaryText, fontSize: 13, fontWeight: '700' },
  });
}

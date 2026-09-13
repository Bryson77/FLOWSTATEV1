import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  Play,
  Layers,
  Flame,
  AlertCircle,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Bell,
  BookOpen,
  ChevronRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface NextClass {
  name: string;
  code: string;
  time: string;
  venue: string;
}

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  prio: string;
}

interface AssessmentItem {
  id: string;
  title: string;
  due_date: string;
  weight_percentage: number | null;
  course_code?: string;
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
  target_hours_per_week: number;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [cardsDueCount, setCardsDueCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick task add
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

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

      const [profileRes, classesRes, coursesRes, tasksRes, assessmentsRes, cardsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('timetable_classes').select('*, courses(name, code)').eq('user_id', user.id).order('start_time'),
        supabase.from('courses').select('*').eq('user_id', user.id).order('name'),
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('assessments').select('*, courses(name, code)').eq('user_id', user.id).eq('completed', false).order('due_date', { ascending: true }).limit(4),
        supabase.from('flashcards').select('id, due_date').eq('user_id', user.id).lte('due_date', todayDateStr),
      ]);

      setProfile(profileRes.data || { study_streak_days: 0, streak_freezes_available: 1 });
      setCourses(coursesRes.data || []);
      setCardsDueCount(cardsRes.data?.length || 0);

      const mappedTasks: TaskItem[] = (tasksRes.data || []).map((t: any) => ({
        id: t.id,
        text: t.text,
        done: !!t.done,
        prio: t.prio || 'normal'
      }));
      setTasks(mappedTasks);

      const mappedAssessments: AssessmentItem[] = (assessmentsRes.data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        weight_percentage: a.weight_percentage,
        course_code: a.courses?.code
      }));
      setAssessments(mappedAssessments);

      // Determine next class
      const classes = classesRes.data || [];
      const todayClasses = classes.filter((c: any) => c.day_of_week === currentDayOfWeek);
      const currentTimeStr = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

      const upcoming = todayClasses.find((c: any) => (c.start_time?.slice(0, 5) || '00:00') >= currentTimeStr);
      if (upcoming) {
        setNextClass({
          name: upcoming.courses?.name || 'Class',
          code: upcoming.courses?.code || '',
          time: `Today · ${upcoming.start_time?.slice(0, 5)} - ${upcoming.end_time?.slice(0, 5)}`,
          venue: upcoming.venue || 'Campus Venue',
        });
      } else if (classes.length > 0) {
        const first = classes[0];
        const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setNextClass({
          name: first.courses?.name || 'Class',
          code: first.courses?.code || '',
          time: `${days[first.day_of_week]} · ${first.start_time?.slice(0, 5)}`,
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

  // Add Task
  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    setIsAddingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          text: newTaskText.trim(),
          prio: 'normal',
          done: false,
          due: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [{ id: data.id, text: data.text, done: false, prio: 'normal' }, ...prev]);
      setNewTaskText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Toggle Task
  const handleToggleTask = async (task: TaskItem) => {
    const updatedDone = !task.done;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: updatedDone } : t));
    try {
      await supabase.from('tasks').update({ done: updatedDone }).eq('id', task.id);
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !updatedDone } : t));
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch {}
  };

  const calculateDaysRemaining = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.subGreeting}>Saktus Academic Cockpit</Text>
          </View>

          <View style={styles.streakBadge}>
            <Flame size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{profile?.study_streak_days || 0}d</Text>
          </View>
        </View>

        {/* Error notice */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Next Class Up Dynamic Island */}
        {nextClass ? (
          <Pressable
            style={styles.card}
            onPress={() => router.push('/schedule')}
          >
            <View style={styles.cardHeader}>
              <View style={styles.statusDot} />
              <Text style={styles.cardTag}>NEXT UP · {nextClass.code}</Text>
            </View>
            <Text style={styles.cardTitle}>{nextClass.name}</Text>
            <Text style={styles.cardSubtitle}>{nextClass.time} · {nextClass.venue}</Text>
          </Pressable>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTag}>SCHEDULE</Text>
            <Text style={styles.cardSubtitle}>No classes scheduled today</Text>
          </View>
        )}

        {/* Quick Task Checklist Widget */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tasks & Reminders</Text>
            <Text style={styles.sectionMeta}>{tasks.filter(t => t.done).length}/{tasks.length}</Text>
          </View>

          <View style={styles.quickAddRow}>
            <TextInput
              style={styles.quickInput}
              placeholder="Add academic task..."
              placeholderTextColor="#71717A"
              value={newTaskText}
              onChangeText={setNewTaskText}
              onSubmitEditing={handleAddTask}
            />
            <Pressable style={styles.quickAddButton} onPress={handleAddTask} disabled={isAddingTask}>
              <Plus size={16} color="#000000" />
            </Pressable>
          </View>

          <View style={styles.taskList}>
            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>No active tasks. Add one above.</Text>
            ) : (
              tasks.map(t => (
                <View key={t.id} style={[styles.taskRow, t.done && styles.taskDone]}>
                  <Pressable onPress={() => handleToggleTask(t)} style={styles.checkButton}>
                    {t.done ? (
                      <CheckCircle2 size={18} color="#10B981" />
                    ) : (
                      <Circle size={18} color="#71717A" />
                    )}
                  </Pressable>
                  <Text style={[styles.taskText, t.done && styles.taskStrike]}>{t.text}</Text>
                  <Pressable onPress={() => handleDeleteTask(t.id)} style={styles.trashBtn}>
                    <Trash2 size={14} color="#71717A" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Upcoming Assessments Countdown HUD */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Critical Assessments</Text>
            <Pressable onPress={() => router.push('/schedule')}>
              <Text style={styles.sectionLink}>View All</Text>
            </Pressable>
          </View>

          {assessments.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming exams logged.</Text>
          ) : (
            assessments.map(exam => {
              const days = calculateDaysRemaining(exam.due_date);
              const isUrgent = days <= 7;

              return (
                <View key={exam.id} style={styles.assessmentRow}>
                  <View>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    <Text style={styles.examSub}>
                      {new Date(exam.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {exam.weight_percentage ? ` · ${exam.weight_percentage}%` : ''}
                    </Text>
                  </View>
                  <View style={[styles.daysPill, isUrgent && styles.daysPillUrgent]}>
                    <Text style={[styles.daysText, isUrgent && styles.daysTextUrgent]}>
                      {days <= 0 ? 'Today' : `${days}d left`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Active Recall (SM-2 Flashcards Due) */}
        <Pressable style={styles.srsCard} onPress={() => router.push('/cards')}>
          <View style={styles.srsHeader}>
            <Layers size={18} color="#A855F7" />
            <Text style={styles.srsTitle}>Flashcards Due</Text>
          </View>
          <View style={styles.srsRow}>
            <Text style={styles.srsCount}>{cardsDueCount}</Text>
            <Text style={styles.srsSub}>
              {cardsDueCount > 0 ? 'Cards due for active recall' : 'All decks reviewed today'}
            </Text>
          </View>
          <View style={styles.srsButton}>
            <Text style={styles.srsButtonText}>Review Now</Text>
            <ChevronRight size={14} color="#000000" />
          </View>
        </Pressable>

        {/* Enrolled Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Enrolled Courses</Text>
            <Text style={styles.sectionMeta}>{courses.length} Active</Text>
          </View>

          {courses.map(course => (
            <View key={course.id} style={styles.courseRow}>
              <View>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseCode}>{course.code}</Text>
              </View>
              <Text style={styles.courseTarget}>{course.target_hours_per_week || 6}h / wk</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Focus Timer Mini-Player */}
      <Pressable style={styles.floatingTimer} onPress={() => router.push('/timer')}>
        <View style={styles.timerDot} />
        <Text style={styles.timerLabel}>Focus Timer · 25:00</Text>
        <Play size={14} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  subGreeting: { fontSize: 12, color: '#71717A', marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#EF4444', fontSize: 12 },
  card: { backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  cardTag: { fontSize: 11, fontWeight: '600', color: '#10B981', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#71717A' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  sectionMeta: { fontSize: 11, color: '#71717A' },
  sectionLink: { fontSize: 12, color: '#A0A0A0', fontWeight: '500' },
  quickAddRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickInput: { flex: 1, backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: '#FFFFFF', fontSize: 12 },
  quickAddButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  taskList: { gap: 6 },
  taskRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 },
  taskDone: { opacity: 0.4 },
  checkButton: { marginRight: 10 },
  taskText: { flex: 1, color: '#FFFFFF', fontSize: 12 },
  taskStrike: { textDecorationLine: 'line-through', color: '#71717A' },
  trashBtn: { padding: 4 },
  emptyText: { color: '#71717A', fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  assessmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 6 },
  examTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  examSub: { fontSize: 11, color: '#71717A', marginTop: 2 },
  daysPill: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  daysPillUrgent: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  daysText: { fontSize: 11, fontWeight: '600', color: '#A0A0A0' },
  daysTextUrgent: { color: '#EF4444' },
  srsCard: { backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', borderRadius: 16, padding: 16, marginBottom: 24 },
  srsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  srsTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  srsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  srsCount: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  srsSub: { fontSize: 12, color: '#71717A' },
  srsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 8 },
  srsButtonText: { fontSize: 12, fontWeight: '600', color: '#000000' },
  courseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 6 },
  courseName: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  courseCode: { fontSize: 11, color: '#71717A', marginTop: 2 },
  courseTarget: { fontSize: 11, color: '#A0A0A0' },
  floatingTimer: { position: 'absolute', bottom: 16, left: 20, right: 20, backgroundColor: '#121215', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 },
  timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  timerLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' }
});

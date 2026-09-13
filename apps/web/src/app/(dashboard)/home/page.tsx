'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Calendar,
  Layers,
  Flame,
  ArrowUpRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Bell,
  Check,
  ChevronRight,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { getLocalISODate } from '@flowstate/study-engine';

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
  due: string | null;
  course_id: string | null;
  course_name?: string;
}

interface AssessmentItem {
  id: string;
  title: string;
  type: string;
  due_date: string;
  weight_percentage: number | null;
  completed: boolean;
  course_name?: string;
  course_code?: string;
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
  color: string | null;
  target_hours_per_week: number | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string | null;
  read: boolean | null;
  created_at: string | null;
}

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cardsDueCount, setCardsDueCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline task quick-add state
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPrio, setNewTaskPrio] = useState('normal');
  const [newTaskCourseId, setNewTaskCourseId] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // In-place assessment modal state
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamCourseId, setNewExamCourseId] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamWeight, setNewExamWeight] = useState('');
  const [isSavingExam, setIsSavingExam] = useState(false);

  const { toast } = useToast();
  const supabase = createClient();

  const fetchCockpitData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Please sign in to view your cockpit.');

      const today = new Date();
      const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon, 7=Sun
      const todayDateStr = getLocalISODate(today);

      // Parallelize queries per Estavo performance standard
      const [
        profileRes,
        classesRes,
        coursesRes,
        tasksRes,
        assessmentsRes,
        cardsRes,
        notificationsRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('timetable_classes').select('*, courses(name, code)').eq('user_id', user.id).order('start_time'),
        supabase.from('courses').select('*').eq('user_id', user.id).order('name'),
        supabase.from('tasks').select('*, courses(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('assessments').select('*, courses(name, code)').eq('user_id', user.id).eq('completed', false).order('due_date', { ascending: true }).limit(5),
        supabase.from('flashcards').select('id, due_date').eq('user_id', user.id).lte('due_date', todayDateStr),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      ]);

      setProfile(profileRes.data || { study_streak_days: 0, streak_freezes_available: 1 });

      const mappedCourses: CourseItem[] = (coursesRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        color: c.color || '#3b82f6',
        target_hours_per_week: c.target_hours_per_week || 0
      }));
      setCourses(mappedCourses);

      setCardsDueCount(cardsRes.data?.length || 0);

      const mappedNotifications: NotificationItem[] = (notificationsRes.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        read: !!n.read,
        created_at: n.created_at || ''
      }));
      setNotifications(mappedNotifications);

      // Format tasks
      const mappedTasks: TaskItem[] = (tasksRes.data || []).map((t: any) => ({
        id: t.id,
        text: t.text,
        done: !!t.done,
        prio: t.prio || 'normal',
        due: t.due,
        course_id: t.course_id,
        course_name: t.courses?.name
      }));
      setTasks(mappedTasks);

      // Format assessments
      const mappedAssessments: AssessmentItem[] = (assessmentsRes.data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type || 'assignment',
        due_date: a.due_date,
        weight_percentage: a.weight_percentage,
        completed: a.completed,
        course_name: a.courses?.name,
        course_code: a.courses?.code
      }));
      setAssessments(mappedAssessments);

      // Calculate Next Class Up
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
        const dayLabel = first.day_of_week ? days[first.day_of_week] || 'Upcoming' : 'Upcoming';
        setNextClass({
          name: first.courses?.name || 'Class',
          code: first.courses?.code || '',
          time: `${dayLabel} · ${first.start_time?.slice(0, 5) || ''}`,
          venue: first.venue || 'Campus Venue',
        });
      } else {
        setNextClass(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load cockpit data.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCockpitData();
  }, [fetchCockpitData]);

  // Handle inline task addition
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    setIsAddingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          text: newTaskText.trim(),
          prio: newTaskPrio,
          course_id: newTaskCourseId || null,
          done: false,
          due: new Date().toISOString().split('T')[0]
        })
        .select('*, courses(name)')
        .single();

      if (error) throw error;

      setTasks(prev => [{
        id: data.id,
        text: data.text,
        done: false,
        prio: data.prio || 'normal',
        due: data.due,
        course_id: data.course_id,
        course_name: data.courses?.name
      }, ...prev]);

      setNewTaskText('');
      toast('Task added', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to add task', 'error');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Toggle task completion
  const handleToggleTask = async (task: TaskItem) => {
    const updatedDone = !task.done;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: updatedDone } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ done: updatedDone })
        .eq('id', task.id);

      if (error) throw error;
      toast(updatedDone ? 'Task completed' : 'Task reopened', 'success');
    } catch (err: any) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !updatedDone } : t));
      toast('Failed to update task', 'error');
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    const original = tasks;
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      toast('Task removed', 'success');
    } catch {
      setTasks(original);
      toast('Failed to delete task', 'error');
    }
  };

  // Handle in-place assessment creation
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim() || !newExamCourseId || !newExamDate) {
      toast('Please fill all required assessment fields', 'error');
      return;
    }

    setIsSavingExam(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          course_id: newExamCourseId,
          title: newExamTitle.trim(),
          due_date: new Date(newExamDate).toISOString(),
          weight_percentage: newExamWeight ? parseFloat(newExamWeight) : null,
          completed: false
        })
        .select('*, courses(name, code)')
        .single();

      if (error) throw error;

      setAssessments(prev => [...prev, {
        id: data.id,
        title: data.title,
        type: data.type || 'assignment',
        due_date: data.due_date,
        weight_percentage: data.weight_percentage,
        completed: false,
        course_name: data.courses?.name,
        course_code: data.courses?.code
      }].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));

      setIsAssessmentModalOpen(false);
      setNewExamTitle('');
      setNewExamWeight('');
      setNewExamDate('');
      toast('Assessment scheduled', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save assessment', 'error');
    } finally {
      setIsSavingExam(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const calculateDaysRemaining = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {getGreeting()}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Here is your academic overview for today.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Center Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl border border-white/10 bg-[#09090b] text-zinc-300 hover:text-white hover:border-white/20 transition-all btn-press"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-white text-black font-mono text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#09090b] shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  <span className="text-[10px] font-mono text-zinc-500">{unreadNotificationsCount} unread</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-xs text-zinc-500">No alerts right now</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="rounded-lg border border-white/[0.04] bg-black/60 p-2.5 space-y-1">
                        <div className="text-xs font-medium text-white">{n.title}</div>
                        <div className="text-[11px] text-zinc-400 leading-snug">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Streak Status Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#09090b] px-4 py-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="font-mono text-xs font-semibold text-white">
              {profile?.study_streak_days || 0} Day Streak
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              | {profile?.streak_freezes_available || 1} freeze
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchCockpitData} className="underline hover:text-white">Retry</button>
        </div>
      )}

      {/* Next Up Class Dynamic Island */}
      {nextClass ? (
        <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-emerald-400 uppercase tracking-wide">Next Up</span>
                <span className="text-xs text-zinc-500 font-mono">·</span>
                <span className="text-xs font-mono text-zinc-400">{nextClass.code}</span>
              </div>
              <h2 className="text-base font-semibold text-white mt-0.5">{nextClass.name}</h2>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-1">
                <span>{nextClass.time}</span>
                <span>·</span>
                <span>{nextClass.venue}</span>
              </p>
            </div>
          </div>

          <Link
            href="/timetable"
            className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-all btn-press"
          >
            View Timetable
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[#09090b] p-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-zinc-500 uppercase">Schedule Status</span>
            <div className="text-sm font-medium text-zinc-300 mt-0.5">No classes scheduled for today.</div>
          </div>
          <Link
            href="/timetable"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
          >
            Manage Timetable <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Main Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Tasks & Upcoming Assessments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks & Reminders Widget with In-line Quick-Add */}
          <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-zinc-300" />
                <h3 className="text-sm font-semibold text-white tracking-tight">Today's Tasks & Reminders</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {tasks.filter(t => t.done).length}/{tasks.length} Completed
              </span>
            </div>

            {/* In-line Quick Add Form */}
            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                placeholder="Add an academic task... (Press Enter)"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                disabled={isAddingTask}
                className="flex-1 rounded-xl border border-white/10 bg-black px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 transition-all"
              />
              <select
                value={newTaskPrio}
                onChange={e => setNewTaskPrio(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/25"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                type="submit"
                disabled={isAddingTask || !newTaskText.trim()}
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all disabled:opacity-50 btn-press"
              >
                Add
              </button>
            </form>

            {/* Task Item List */}
            <div className="space-y-2 pt-1">
              {tasks.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-xl text-xs text-zinc-600">
                  No active tasks. Add your first academic item above.
                </div>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    className={`group flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] p-3 transition-all ${
                      task.done ? 'bg-white/[0.01] opacity-50' : 'bg-black/60 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="text-zinc-400 hover:text-white transition-colors shrink-0"
                      >
                        {task.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>
                      <span className={`text-xs truncate ${task.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                        {task.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.prio === 'urgent' && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase bg-red-500/10 border border-red-500/30 text-red-400">
                          Urgent
                        </span>
                      )}
                      {task.course_name && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/[0.04]">
                          {task.course_name}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-1"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Assessments HUD with In-place CRUD */}
          <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-300" />
                <h3 className="text-sm font-semibold text-white tracking-tight">Critical Assessment Countdowns</h3>
              </div>
              <button
                onClick={() => setIsAssessmentModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white btn-press"
              >
                <Plus className="h-3.5 w-3.5" /> Add Exam
              </button>
            </div>

            <div className="space-y-2.5">
              {assessments.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-xl text-xs text-zinc-600">
                  No upcoming exams or assignments logged.
                </div>
              ) : (
                assessments.map(exam => {
                  const daysLeft = calculateDaysRemaining(exam.due_date);
                  const isCritical = daysLeft <= 7;
                  const isModerate = daysLeft > 7 && daysLeft <= 14;

                  return (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-black/60 hover:border-white/10 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{exam.title}</span>
                          {exam.course_code && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                              {exam.course_code}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {new Date(exam.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {exam.weight_percentage && ` · Weight: ${exam.weight_percentage}%`}
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                        isCritical
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : isModerate
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-white/[0.04] text-zinc-300 border border-white/[0.08]'
                      }`}>
                        {daysLeft <= 0 ? 'Due Today' : `${daysLeft}d left`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Flashcard SRS Due Ring & Enrolled Courses */}
        <div className="space-y-6">
          {/* Flashcard Due Review Ring */}
          <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Layers className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">Active Recall (SM-2)</h3>
            </div>

            <div className="text-center py-4 space-y-3">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full border-2 border-purple-500/30 bg-purple-500/10 font-mono text-2xl font-bold text-white tnum">
                {cardsDueCount}
              </div>
              <div>
                <div className="text-xs font-medium text-white">
                  {cardsDueCount > 0 ? `${cardsDueCount} Cards Due Today` : 'All Decks Caught Up'}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Spaced repetition queue based on retention intervals.
                </p>
              </div>

              <Link
                href="/flashcards"
                className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
              >
                Review Deck Queue
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Enrolled Courses / Subject Matrix */}
          <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">Enrolled Subjects</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">{courses.length} courses</span>
            </div>

            <div className="space-y-3">
              {courses.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-600">
                  No courses registered yet.
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="p-3 rounded-xl border border-white/[0.04] bg-black/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{course.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
                        {course.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                      <span>Target: {course.target_hours_per_week || 6}h / week</span>
                      <Link
                        href={`/timer?course=${course.id}`}
                        className="text-xs font-semibold text-zinc-300 hover:text-white"
                      >
                        Start Focus
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* In-place Add Assessment Modal */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white">Log Upcoming Assessment</h3>
              <button onClick={() => setIsAssessmentModalOpen(false)} className="text-zinc-500 hover:text-white">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Exam 1"
                  value={newExamTitle}
                  onChange={e => setNewExamTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Subject</label>
                <select
                  value={newExamCourseId}
                  onChange={e => setNewExamCourseId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  required
                >
                  <option value="">Select subject...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={e => setNewExamDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={newExamWeight}
                    onChange={e => setNewExamWeight(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExam}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
                >
                  {isSavingExam ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock, Trash2, Award, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

interface AssessmentItem {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  title: string;
  type: string | null;
  due_date: string;
  weight_percentage: number | null;
  target_study_hours: number | null;
  venue: string | null;
  completed: boolean | null;
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
}

export default function ExamsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('exam');
  const [dueDate, setDueDate] = useState('');
  const [weight, setWeight] = useState('20');
  const [targetHours, setTargetHours] = useState('15');
  const [venue, setVenue] = useState('');

  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Please sign in to view assessments.');

      // Parallelize queries per Estavo performance standard
      const [assessmentsRes, coursesRes] = await Promise.all([
        supabase
          .from('assessments')
          .select('*, courses(name, code)')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true }),
        supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
      ]);

      if (assessmentsRes.error) throw assessmentsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      const mapped: AssessmentItem[] = (assessmentsRes.data || []).map((a: any) => ({
        id: a.id,
        course_id: a.course_id,
        course_name: a.courses?.name || 'Course',
        course_code: a.courses?.code || '',
        title: a.title,
        type: a.type || 'exam',
        due_date: a.due_date,
        weight_percentage: a.weight_percentage,
        target_study_hours: a.target_study_hours,
        venue: a.venue,
        completed: a.completed || false,
      }));

      setAssessments(mapped);
      setCourses(coursesRes.data || []);
      if (coursesRes.data && coursesRes.data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesRes.data[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load assessments. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      let courseIdToUse = selectedCourseId;
      if (!courseIdToUse && courses.length > 0) {
        courseIdToUse = courses[0].id;
      }

      // If user has no courses yet, create one automatically
      if (!courseIdToUse) {
        const { data: newCourse, error: courseErr } = await supabase
          .from('courses')
          .insert({
            user_id: user.id,
            name: 'General Academics',
            code: 'GEN101',
          })
          .select()
          .single();
        if (courseErr) throw courseErr;
        courseIdToUse = newCourse.id;
      }

      const { error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          course_id: courseIdToUse,
          title: title.trim(),
          type,
          due_date: new Date(dueDate).toISOString(),
          weight_percentage: parseFloat(weight) || 0,
          target_study_hours: parseFloat(targetHours) || 10,
          venue: venue.trim() || null,
          completed: false,
        });

      if (error) throw error;

      toast('✓ Saved');
      setIsModalOpen(false);
      setTitle('');
      setDueDate('');
      setVenue('');
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (id: string, currentStatus: boolean | null) => {
    try {
      const nextStatus = !currentStatus;
      const { error } = await supabase
        .from('assessments')
        .update({ completed: nextStatus })
        .eq('id', id);

      if (error) throw error;
      setAssessments(prev => prev.map(a => a.id === id ? { ...a, completed: nextStatus } : a));
      toast(nextStatus ? '✓ Completed' : '✓ Reopened');
    } catch {
      toast('Failed to update. Try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAssessments(prev => prev.filter(a => a.id !== id));
      toast('✓ Removed');
    } catch {
      toast('Failed to remove. Try again.', 'error');
    }
  };

  const calculateDaysLeft = (dueDateStr: string) => {
    const diff = new Date(dueDateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    return `${days}d left`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Assessments</h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">Chronological exam countdowns & grade weightings.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Assessment</span>
        </button>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="rounded-xl border border-[#E74C3C]/30 bg-[#E74C3C]/10 p-4 text-xs text-[#E74C3C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchData}
            className="font-medium underline hover:text-white ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 w-full skeleton rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && assessments.length === 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="font-display text-xl font-bold text-white">No assessments added yet</h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            Track your midterm exams, assignments, projects, and target study hours with clear countdowns.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Assessment</span>
          </button>
        </div>
      )}

      {/* Assessment List */}
      {!loading && !errorMsg && assessments.length > 0 && (
        <div className="space-y-3">
          {assessments.map((a) => {
            const daysText = calculateDaysLeft(a.due_date);
            const isUrgent = daysText === 'Today' || daysText === '1d left' || daysText === '2d left';

            return (
              <div
                key={a.id}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#2A2A2A] bg-[#111111] p-4 transition-all hover:border-white/20 ${
                  a.completed ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => handleToggleComplete(a.id, a.completed)}
                    className={`mt-1 flex-shrink-0 rounded-full border p-1 transition-colors ${
                      a.completed
                        ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]'
                        : 'border-[#2A2A2A] text-transparent hover:border-white/40'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-white/10 text-white">
                        {a.type}
                      </span>
                      {a.course_code && (
                        <span className="font-mono text-xs text-[#A0A0A0]">
                          {a.course_code}
                        </span>
                      )}
                      {a.weight_percentage != null && (
                        <span className="font-mono text-xs text-amber-400 font-semibold">
                          {a.weight_percentage}% of grade
                        </span>
                      )}
                    </div>
                    <h3 className={`font-semibold text-base text-white ${a.completed ? 'line-through text-[#A0A0A0]' : ''}`}>
                      {a.title}
                    </h3>
                    {a.venue && (
                      <p className="text-xs text-[#A0A0A0]">Venue: {a.venue}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
                  <div className="text-left sm:text-right font-mono">
                    <div className={`text-xs font-semibold ${isUrgent ? 'text-[#E74C3C]' : 'text-white'}`}>
                      {daysText}
                    </div>
                    <div className="text-[11px] text-[#A0A0A0]">
                      {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(a.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#A0A0A0] hover:text-[#E74C3C] transition-opacity"
                    title="Delete assessment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Assessment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h2 className="font-display text-lg font-bold text-white">Add Assessment</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A0A0A0] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAssessment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Exam 1: Data Structures"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                />
              </div>

              {courses.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                  >
                    <option value="exam">Exam</option>
                    <option value="test">Test</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Weight (% of final)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Target Study Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Venue (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sports Hall Exam Center"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-[#A0A0A0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, MapPin, Trash2, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { getSafeErrorMessage } from '@/lib/errors';
import { createClassSchema, validateWithZod } from '@/lib/schemas';

interface ClassItem {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string | null;
  class_type: string | null;
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

const DAYS = [
  { num: 1, label: 'Mon' },
  { num: 2, label: 'Tue' },
  { num: 3, label: 'Wed' },
  { num: 4, label: 'Thu' },
  { num: 5, label: 'Fri' },
  { num: 6, label: 'Sat' },
  { num: 7, label: 'Sun' },
];

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [venue, setVenue] = useState('');
  const [classType, setClassType] = useState('lecture');

  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be signed in to view your timetable.');

      // Parallelize courses and classes fetches
      const [coursesRes, classesRes] = await Promise.all([
        supabase
          .from('courses')
          .select('id, name, code, color')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('timetable_classes')
          .select(`
            id,
            course_id,
            day_of_week,
            start_time,
            end_time,
            venue,
            class_type,
            courses (
              name,
              code,
              color
            )
          `)
          .eq('user_id', user.id)
          .order('start_time', { ascending: true })
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (classesRes.error) throw classesRes.error;

      const coursesData: CourseItem[] = coursesRes.data || [];
      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesData[0].id);
      }

      // Map relational join safely
      const mappedClasses: ClassItem[] = (classesRes.data || []).map((c: any) => ({
        id: c.id,
        course_id: c.course_id,
        day_of_week: c.day_of_week,
        start_time: c.start_time,
        end_time: c.end_time,
        venue: c.venue,
        class_type: c.class_type,
        course_name: c.courses?.name || 'Untitled Course',
        course_code: c.courses?.code || '',
        course_color: c.courses?.color || null,
      }));

      setClasses(mappedClasses);
    } catch (err: any) {
      console.error('Timetable fetch error:', err);
      setErrorMsg(getSafeErrorMessage(err, 'Failed to load timetable. Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateWithZod(createClassSchema, {
      courseId: selectedCourseId || null,
      newCourseName: newCourseName.trim() || undefined,
      dayOfWeek,
      startTime,
      endTime,
      venue: venue.trim() || null,
      classType,
    });

    if (!validation.success) {
      toast(validation.error, 'error');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      let activeCourseId = selectedCourseId;

      // Handle in-place course creation if none existed
      if (!activeCourseId && newCourseName.trim()) {
        const { data: newCourse, error: courseErr } = await supabase
          .from('courses')
          .insert({
            user_id: user.id,
            name: newCourseName.trim(),
            code: newCourseCode.trim() || newCourseName.substring(0, 4).toUpperCase(),
          })
          .select('id')
          .single();

        if (courseErr) throw courseErr;
        activeCourseId = newCourse.id;
      }

      if (!activeCourseId) {
        toast('Fill this in: Please select or enter a course name.', 'error');
        setSaving(false);
        return;
      }

      // 1. Insert class into timetable
      const { error: classErr } = await supabase
        .from('timetable_classes')
        .insert({
          user_id: user.id,
          course_id: activeCourseId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          venue: venue.trim() || null,
          class_type: classType,
        });

      if (classErr) throw classErr;

      // 2. Clear state, notify user, refresh
      toast('Class added to schedule.', 'success');
      setIsModalOpen(false);
      setVenue('');
      fetchData();
    } catch (err: any) {
      console.error('Add class error:', err);
      toast(getSafeErrorMessage(err, 'Failed to add class. Something went wrong.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('timetable_classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      setClasses(prev => prev.filter(c => c.id !== classId));
      toast('Class removed.', 'default');
    } catch (err: any) {
      console.error('Delete class error:', err);
      toast(getSafeErrorMessage(err, 'Failed to remove class. Something went wrong.'), 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Timetable</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Weekly calendar & venue schedule.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-2 text-xs font-semibold transition-all btn-press"
        >
          <Plus className="h-4 w-4" />
          <span>Add Class</span>
        </button>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchData}
            className="font-medium underline hover:text-black dark:hover:text-white ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {DAYS.map((d) => (
            <div key={d.num} className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <div className="h-4 w-12 skeleton" />
              <div className="h-24 w-full skeleton rounded-xl" />
              <div className="h-24 w-full skeleton rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && classes.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">No classes scheduled yet</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Add your lectures, tutorials, and labs to build your weekly schedule.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-5 py-2.5 text-xs font-semibold transition-all btn-press"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Class</span>
          </button>
        </div>
      )}

      {/* Weekly 7-Day Grid */}
      {!loading && !errorMsg && classes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {DAYS.map((day) => {
            const dayClasses = classes.filter(c => c.day_of_week === day.num);

            return (
              <div
                key={day.num}
                className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 min-h-[380px]"
              >
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    {day.label}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {dayClasses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400 italic">
                      No classes
                    </div>
                  ) : (
                    dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {cls.class_type}
                          </span>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-0.5"
                            title="Delete class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mt-1.5 leading-snug">
                          {cls.course_name}
                        </h3>
                        {cls.course_code && (
                          <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                            {cls.course_code}
                          </div>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Clock className="h-3 w-3 text-zinc-400" />
                            <span>{cls.start_time} - {cls.end_time}</span>
                          </div>
                          {cls.venue && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-zinc-400" />
                              <span className="truncate">{cls.venue}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Class */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Add Class to Schedule</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              {/* Course Selection or Create */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Course
                </label>
                {courses.length > 0 ? (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Course Name (e.g. Computer Science)"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                    <input
                      type="text"
                      placeholder="Course Code (e.g. CSC2001F)"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>
                )}
              </div>

              {/* Day & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Day
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  >
                    {DAYS.map((d) => (
                      <option key={d.num} value={d.num}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Type
                  </label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="lab">Lab</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Venue / Room
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Block LT2"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-5 py-2 text-xs font-semibold transition-all btn-press disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

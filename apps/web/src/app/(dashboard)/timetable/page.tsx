'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, MapPin, Trash2, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

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

      // Parallelize queries per Estavo performance standard
      const [classesRes, coursesRes] = await Promise.all([
        supabase
          .from('timetable_classes')
          .select('*, courses(name, code, color)')
          .eq('user_id', user.id)
          .order('start_time', { ascending: true }),
        supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (coursesRes.error) throw coursesRes.error;

      const mappedClasses: ClassItem[] = (classesRes.data || []).map((c: any) => ({
        id: c.id,
        course_id: c.course_id,
        course_name: c.courses?.name || 'Class',
        course_code: c.courses?.code || '',
        day_of_week: c.day_of_week,
        start_time: c.start_time?.slice(0, 5) || '09:00',
        end_time: c.end_time?.slice(0, 5) || '10:30',
        venue: c.venue,
        class_type: c.class_type || 'lecture',
      }));

      setClasses(mappedClasses);
      setCourses(coursesRes.data || []);
      if (coursesRes.data && coursesRes.data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesRes.data[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load timetable. Check connection.');
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      let courseIdToUse = selectedCourseId;

      // If user is adding a new course inline
      if (!courseIdToUse && newCourseName.trim()) {
        const { data: newCourse, error: courseErr } = await supabase
          .from('courses')
          .insert({
            user_id: user.id,
            name: newCourseName.trim(),
            code: newCourseCode.trim() || newCourseName.slice(0, 3).toUpperCase() + '101',
            color: '#3B82F6',
          })
          .select()
          .single();

        if (courseErr) throw courseErr;
        courseIdToUse = newCourse.id;
        setCourses(prev => [...prev, newCourse]);
      }

      if (!courseIdToUse) {
        throw new Error('Please select or specify a course.');
      }

      const { error: classErr } = await supabase
        .from('timetable_classes')
        .insert({
          user_id: user.id,
          course_id: courseIdToUse,
          day_of_week: Number(dayOfWeek),
          start_time: startTime,
          end_time: endTime,
          venue: venue.trim() || null,
          class_type: classType,
        });

      if (classErr) throw classErr;

      toast('Class saved', 'success');
      setIsModalOpen(false);
      setNewCourseName('');
      setNewCourseCode('');
      setVenue('');
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('timetable_classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setClasses(prev => prev.filter(c => c.id !== id));
      toast('Class removed', 'info');
    } catch (err: any) {
      toast('Failed to remove. Try again.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Timetable</h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">Weekly class matrix & venue coordinates.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Class</span>
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

      {/* Loading State (Skeletons Only — No Spinners per Estavo Spec) */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {DAYS.map((d) => (
            <div key={d.num} className="space-y-3 rounded-xl border border-[#2A2A2A] bg-[#111111] p-4">
              <div className="h-4 w-12 skeleton" />
              <div className="h-24 w-full skeleton rounded-lg" />
              <div className="h-24 w-full skeleton rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State (Centered, Display Heading, Inter Body, CTA Button, No Illustrations) */}
      {!loading && !errorMsg && classes.length === 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="font-display text-xl font-bold text-white">No classes scheduled yet</h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            Add your lectures, tutorials, and labs to build your weekly schedule matrix and enable Next Up countdowns.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Class</span>
          </button>
        </div>
      )}

      {/* Weekly Matrix Grid */}
      {!loading && !errorMsg && classes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {DAYS.map((day) => {
            const dayClasses = classes.filter(c => c.day_of_week === day.num);

            return (
              <div
                key={day.num}
                className="flex flex-col rounded-xl border border-[#2A2A2A] bg-[#111111] p-4 min-h-[380px]"
              >
                <div className="border-b border-[#2A2A2A] pb-3 mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    {day.label}
                  </span>
                  <span className="font-mono text-[11px] text-[#A0A0A0]">
                    {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {dayClasses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#4A4A4A] italic">
                      No classes
                    </div>
                  ) : (
                    dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="group relative rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3 transition-all hover:border-white/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-white/10 text-white">
                            {cls.class_type}
                          </span>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#A0A0A0] hover:text-[#E74C3C] transition-opacity"
                            title="Delete class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <h3 className="font-semibold text-sm text-white mt-1.5 leading-snug">
                          {cls.course_name}
                        </h3>
                        {cls.course_code && (
                          <div className="text-[11px] font-mono text-[#A0A0A0] mt-0.5">
                            {cls.course_code}
                          </div>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1 text-[11px] text-[#A0A0A0]">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Clock className="h-3 w-3 text-zinc-500" />
                            <span>{cls.start_time} - {cls.end_time}</span>
                          </div>
                          {cls.venue && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-zinc-500" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h2 className="font-display text-lg font-bold text-white">Add Class to Schedule</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A0A0A0] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              {/* Course Selection or Create */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Course
                </label>
                {courses.length > 0 ? (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
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
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                    />
                    <input
                      type="text"
                      placeholder="Course Code (e.g. CSC2001F)"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                    />
                  </div>
                )}
              </div>

              {/* Day & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Day
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                  >
                    {DAYS.map((d) => (
                      <option key={d.num} value={d.num}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Type
                  </label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
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
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Venue Coordinates
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Block LT2"
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

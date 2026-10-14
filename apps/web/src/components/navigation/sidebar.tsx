'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  GraduationCap, 
  Layers, 
  Timer, 
  Users, 
  BarChart3, 
  Settings, 
  Plus,
  X
} from 'lucide-react';
import { NavItem } from './nav-item';
import { ThemeToggle } from '../theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { getSafeErrorMessage } from '@/lib/errors';

const mainNavItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/timetable', icon: Calendar, label: 'Timetable' },
  { href: '/exams', icon: GraduationCap, label: 'Exams' },
  { href: '/flashcards', icon: Layers, label: 'Flashcards' },
  { href: '/timer', icon: Timer, label: 'Timer' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

interface CourseItem {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

const COLOR_OPTIONS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-zinc-500',
];

export function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const { toast } = useToast();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseColor, setCourseColor] = useState(COLOR_OPTIONS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code, color')
        .eq('user_id', user.id)
        .order('name');

      if (!error && data) {
        setCourses(data);
      }
    } catch (err) {
      console.error('Error loading courses in sidebar:', err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          name: courseName.trim(),
          code: courseCode.trim() || courseName.trim().slice(0, 4).toUpperCase(),
          color: courseColor,
        });

      if (error) throw error;

      toast('Course added successfully.', 'success');
      setCourseName('');
      setCourseCode('');
      setIsAddCourseOpen(false);
      fetchCourses();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, 'Failed to add course.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full w-[240px] flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 transition-colors duration-150">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-800">
        <Link href="/home" className="flex items-center gap-2.5 group">
          <img
            src="/icon.png"
            alt="Saktus Logo"
            className="h-7 w-7 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105 btn-press"
          />
          <span className="font-display text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Saktus</span>
        </Link>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-1 px-3">
          {mainNavItems.map((item) => (
            <NavItem 
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname.startsWith(item.href)}
              variant="sidebar"
            />
          ))}
        </nav>

        {/* My Courses */}
        <div className="mt-8 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">My Courses</h2>
            <button 
              onClick={() => setIsAddCourseOpen(true)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-white/5 btn-press"
              aria-label="Add course"
              title="Add course"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {courses.length === 0 ? (
              <button
                onClick={() => setIsAddCourseOpen(true)}
                className="w-full text-left text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1.5 px-2 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800"
              >
                + Add your first course
              </button>
            ) : (
              courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/flashcards?course=${course.id}`}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer group transition-colors btn-press"
                >
                  <div className={`h-2 w-2 rounded-full ${course.color || 'bg-zinc-500'}`} />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors truncate">
                    {course.name}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Profile, Settings & Theme Toggle */}
      <div className="p-3 mt-auto border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">Theme</span>
          <ThemeToggle variant="pill" />
        </div>
        <NavItem 
          href="/settings"
          icon={Settings}
          label="Settings"
          isActive={pathname.startsWith('/settings')}
          variant="sidebar"
        />
      </div>

      {/* Add Course Modal */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Add Course / Subject
              </h3>
              <button
                onClick={() => setIsAddCourseOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Course Code (Optional)
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. CS101"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Tag Color
                </label>
                <div className="flex gap-2 mt-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCourseColor(c)}
                      className={`h-6 w-6 rounded-full ${c} transition-transform ${
                        courseColor === c ? 'scale-110 ring-2 ring-zinc-900 dark:ring-white ring-offset-2 dark:ring-offset-black' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCourseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press disabled:opacity-50"
                >
                  {isSaving ? 'Adding...' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

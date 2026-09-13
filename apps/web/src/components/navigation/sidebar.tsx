'use client';

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
  Plus 
} from 'lucide-react';
import { NavItem } from './nav-item';
import { ThemeToggle } from '../theme-toggle';

const mainNavItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/timetable', icon: Calendar, label: 'Timetable' },
  { href: '/exams', icon: GraduationCap, label: 'Exams' },
  { href: '/flashcards', icon: Layers, label: 'Flashcards' },
  { href: '/timer', icon: Timer, label: 'Timer' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

const courses = [
  { id: '1', name: 'Computer Science', color: 'bg-blue-500' },
  { id: '2', name: 'Mathematics', color: 'bg-red-500' },
  { id: '3', name: 'Physics', color: 'bg-green-500' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-[240px] flex-col bg-white/80 dark:bg-black/80 backdrop-blur-[40px] border-r border-black/[0.08] dark:border-white/10 transition-colors duration-150">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-black/[0.04] dark:border-white/5">
        <Link href="/home" className="flex items-center gap-2.5 group">
          <div className="h-7 w-7 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-display font-bold text-xs transition-transform group-hover:scale-105 btn-press">
            S
          </div>
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
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-white/5 btn-press"
              aria-label="Add course"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {courses.map((course) => (
              <div 
                key={course.id} 
                className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer group transition-colors btn-press"
              >
                <div className={`h-2 w-2 rounded-full ${course.color}`} />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  {course.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile, Settings & Theme Toggle */}
      <div className="p-3 mt-auto border-t border-black/[0.04] dark:border-white/5 space-y-2">
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
    </div>
  );
}

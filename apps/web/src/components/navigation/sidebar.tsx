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
    <div className="flex h-full w-[240px] flex-col bg-[rgba(255,255,255,0.01)] backdrop-blur-[40px] border-r border-white/5 saturate-[150%]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <span className="font-display text-xl font-bold text-white tracking-tight">FlowState</span>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-2">
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
            <h2 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">My Courses</h2>
            <button className="text-[#A0A0A0] hover:text-white transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/5 cursor-pointer group transition-colors">
                <div className={`h-2 w-2 rounded-full ${course.color}`} />
                <span className="text-sm text-[#A0A0A0] group-hover:text-white transition-colors">{course.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile / Settings */}
      <div className="p-3 mt-auto">
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

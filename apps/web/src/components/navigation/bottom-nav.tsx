'use client';

import { usePathname } from 'next/navigation';
import { Home, Calendar, Layers, Timer, Users } from 'lucide-react';
import { NavItem } from './nav-item';

const bottomNavItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/timetable', icon: Calendar, label: 'Schedule' },
  { href: '/flashcards', icon: Layers, label: 'Cards' },
  { href: '/timer', icon: Timer, label: 'Timer' },
  { href: '/friends', icon: Users, label: 'Social' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-around bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 pb-safe transition-colors duration-150">
      {bottomNavItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isActive={pathname.startsWith(item.href)}
          variant="bottom"
        />
      ))}
    </div>
  );
}

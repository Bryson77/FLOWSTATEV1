import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  key?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  variant: 'sidebar' | 'bottom';
}

export function NavItem({ href, icon: Icon, label, isActive, variant }: NavItemProps) {
  if (variant === 'sidebar') {
    return (
      <Link
        href={href}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all btn-press ${
          isActive
            ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold shadow-xs'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-zinc-900 dark:bg-white" />
        )}
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </Link>
    );
  }

  // Bottom Nav variant
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] transition-all btn-press ${
        isActive ? 'text-zinc-900 dark:text-white font-semibold' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

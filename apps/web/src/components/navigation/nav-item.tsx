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
        className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
          isActive
            ? 'bg-white/5 text-white'
            : 'text-[#A0A0A0] hover:bg-white/5 hover:text-white'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-white" />
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
      className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] transition-all active:scale-[0.97] ${
        isActive ? 'text-white' : 'text-[#A0A0A0]'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

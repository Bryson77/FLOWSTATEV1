import { Sidebar } from '@/components/navigation/sidebar';
import { BottomNav } from '@/components/navigation/bottom-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

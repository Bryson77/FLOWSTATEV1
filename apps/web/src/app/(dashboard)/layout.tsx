import { Sidebar } from '@/components/navigation/sidebar';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { OnboardingModal } from '@/components/onboarding-modal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-150">
      {/* First-run onboarding wizard */}
      <OnboardingModal />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-28 lg:py-8">
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

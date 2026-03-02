'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { DashboardHeader } from './dashboard-header';
import { cn } from '@/lib/utils';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        'flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300',
        'ml-0',
        collapsed ? 'lg:ml-16' : 'lg:ml-60'
      )}
    >
      <DashboardHeader />
      <main className="flex-1 px-4 pr-5 sm:px-6 sm:pr-6 lg:px-8 lg:pr-8 py-4 sm:py-6 lg:py-8 w-full min-w-0 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

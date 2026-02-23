'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { DashboardHeader } from './dashboard-header';
import { cn } from '@/lib/utils';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-300',
        collapsed ? 'ml-16' : 'ml-60'
      )}
    >
      <DashboardHeader />
      <main className="flex-1 p-6 lg:p-8 w-full min-w-0">
        {children}
      </main>
    </div>
  );
}

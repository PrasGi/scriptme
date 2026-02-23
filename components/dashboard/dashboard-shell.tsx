'use client';

import { SidebarProvider } from '@/contexts/sidebar-context';
import { Sidebar } from './sidebar';
import { DashboardMain } from './dashboard-main';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#0B0E14] flex">
        <Sidebar />
        <DashboardMain>{children}</DashboardMain>
      </div>
    </SidebarProvider>
  );
}

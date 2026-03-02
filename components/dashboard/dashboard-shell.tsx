'use client';

import { SidebarProvider } from '@/contexts/sidebar-context';
import { Sidebar } from './sidebar';
import { DashboardMain } from './dashboard-main';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="dashboard-theme min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white flex overflow-x-hidden">
        <Sidebar />
        <DashboardMain>{children}</DashboardMain>
      </div>
    </SidebarProvider>
  );
}

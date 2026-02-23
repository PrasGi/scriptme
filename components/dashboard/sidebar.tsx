'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogoStatic } from '@/components/common/logo';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  UserCog,
  Bell,
  FileText,
  Bot,
  Plus,
  X,
  Loader2,
  Tag,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSidebar } from '@/contexts/sidebar-context';
import { usePermissions } from '@/hooks/use-permissions';

// ─── Nav item types ──────────────────────────────────────────────────────────

interface NavItem {
  label:      string;
  href:       string;
  icon:       React.ElementType;
  /** If set, item is hidden unless user has at least one of these permission keys */
  requires?:  string[];
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const mainNavItems: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Projects',   href: '/projects',    icon: FolderOpen,  requires: ['project:read:own', 'project:read:all'] },
  { label: 'Characters', href: '/characters',  icon: Users,       requires: ['character:read:own', 'character:read:all'] },
  { label: 'Billing',    href: '/billing',     icon: CreditCard,  requires: ['billing:read:own', 'billing:read:all'] },
  { label: 'Settings',   href: '/settings',    icon: Settings },
];

const adminNavItems: NavItem[] = [
  { label: 'Users',       href: '/admin/users',            icon: UserCog,  requires: ['user:read:all'] },
  { label: 'Notifications', href: '/admin/notifications',  icon: Bell,     requires: ['user:read:all'] },
  { label: 'IAM',         href: '/admin/iam',              icon: Shield,   requires: ['role:read:all'] },
  { label: 'Plans',       href: '/admin/plans',            icon: CreditCard, requires: ['role:read:all'] },
  { label: 'Vouchers',    href: '/admin/vouchers',         icon: Tag,       requires: ['role:read:all'] },
  { label: 'Transactions', href: '/admin/transactions',    icon: Receipt,   requires: ['role:read:all'] },
  { label: 'AI Usage',    href: '/admin/ai-usage',         icon: Bot,      requires: ['role:read:all'] },
  { label: 'TikTok Lab',  href: '/admin/transcript-test',  icon: FileText, requires: ['role:read:all'] },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface Project { _id: string; title: string }

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { collapsed, toggle } = useSidebar();
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const { user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();

  function openPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then((json) => { if (json.success) setProjects(json.data ?? []); })
      .catch(() => {})
      .finally(() => setPickerLoading(false));
  }

  /** Filter a nav list down to items the current user can see */
  function visibleItems(items: NavItem[]) {
    return items.filter((item) => {
      if (!item.requires) return true;
      return hasAnyPermission(...item.requires);
    });
  }

  const visibleMain  = visibleItems(mainNavItems);
  const visibleAdmin = visibleItems(adminNavItems);

  /** Derive initials for the avatar */
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';
  const roleName = user?.roleName ?? 'creator';

  function renderNavItem(item: NavItem) {
    const Icon   = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    const isProjects = item.href === '/projects';

    return (
      <div key={item.href} className="relative flex items-center group/nav w-full">
        <Link
          href={item.href}
          className={cn(
            'flex flex-1 min-w-0 w-full items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium transition-all duration-150',
            active
              ? 'bg-[#06B6D4]/10 text-[#06B6D4]'
              : 'text-[#8B949E] hover:text-white hover:bg-white/[0.05]',
            collapsed && 'justify-center px-2'
          )}
        >
          <Icon size={17} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
        {isProjects && !collapsed && (
          <button
            onClick={(e) => { e.preventDefault(); openPicker(); }}
            className="absolute right-1 p-1 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.08] opacity-0 group-hover/nav:opacity-100 transition-all"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col',
        'border-r border-white/[0.06] bg-[#0D1117]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-white/[0.06] h-16', collapsed ? 'justify-center px-2' : 'px-5')}>
        {collapsed ? (
          <Image
            src="/assets/logo/logo-script-minder.png"
            alt="ScriptMinder"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        ) : (
          <LogoStatic size="lg" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">

        {/* Main navigation */}
        {visibleMain.map(renderNavItem)}

        {/* Admin navigation — only rendered if user has at least one admin nav item */}
        {visibleAdmin.length > 0 && (
          <>
            <div className={cn('pt-4 pb-1', collapsed ? 'px-0' : 'px-2')}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B949E]/60 mb-1">
                  Admin
                </p>
              )}
              {collapsed && <div className="border-t border-white/[0.06] mb-2" />}
            </div>
            {visibleAdmin.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-3 space-y-1">
        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-[#06B6D4] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name ?? 'Loading…'}</div>
              <div className="text-xs text-[#8B949E] truncate capitalize">{roleName} Plan</div>
            </div>
          </div>
        )}
        {/* Logout */}
        <button
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-3 h-9 text-sm text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-3 h-9 text-sm text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>

    {/* Project picker modal */}
    {pickerOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0D1117] shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">New Script — Pick a Project</h2>
            <button
              onClick={() => setPickerOpen(false)}
              className="text-[#8B949E] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-3 max-h-72 overflow-y-auto">
            {pickerLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[#06B6D4]" />
              </div>
            )}
            {!pickerLoading && projects.length === 0 && (
              <p className="text-sm text-[#8B949E] text-center py-6">No projects yet.</p>
            )}
            {!pickerLoading && projects.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  setPickerOpen(false);
                  router.push(`/projects/${p._id}/scripts/new`);
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                {p.title}
              </button>
            ))}
          </div>
          <div className="px-3 pb-3">
            <button
              onClick={() => { setPickerOpen(false); router.push('/projects/new'); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[#06B6D4] border border-[#06B6D4]/20 hover:bg-[#06B6D4]/10 transition-colors"
            >
              <Plus size={14} />
              Create new project first
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

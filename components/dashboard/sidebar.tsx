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
  MessageSquare,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
  { label: 'Feedback',    href: '/admin/feedback',        icon: MessageSquare, requires: ['user:read:all'] },
  { label: 'IAM',         href: '/admin/iam',              icon: Shield,   requires: ['role:read:all'] },
  { label: 'Plans',       href: '/admin/plans',            icon: CreditCard, requires: ['role:read:all'] },
  { label: 'Vouchers',    href: '/admin/vouchers',         icon: Tag,       requires: ['role:read:all'] },
  { label: 'Transactions', href: '/admin/transactions',    icon: Receipt,   requires: ['role:read:all'] },
  { label: 'AI Usage',    href: '/admin/ai-usage',         icon: Bot,      requires: ['role:read:all'] },
  { label: 'TikTok Lab',  href: '/admin/transcript-test',  icon: FileText, requires: ['role:read:all'] },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface Project { _id: string; title: string }

const LG_BREAKPOINT = 1024;

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const { user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();

  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    setIsLg(m.matches);
    const handler = () => setIsLg(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, []);

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
          onClick={() => !isLg && setMobileOpen(false)}
          className={cn(
            'flex flex-1 min-w-0 w-full items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium transition-all duration-150',
            active
              ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
            collapsed && isLg && 'justify-center px-2'
          )}
        >
          <Icon size={17} className="shrink-0" />
          {(!collapsed || !isLg) && <span className="truncate">{item.label}</span>}
        </Link>
        {isProjects && (!collapsed || !isLg) && (
          <button
            onClick={(e) => { e.preventDefault(); openPicker(); }}
            className="absolute right-1 p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 opacity-0 group-hover/nav:opacity-100 transition-all"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
    {/* Backdrop when sidebar open on mobile/tablet */}
    {!isLg && mobileOpen && (
      <div
        className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        aria-hidden
        onClick={() => setMobileOpen(false)}
      />
    )}
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col',
        'border-r border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-lg shadow-slate-200/20',
        'transition-all duration-300 ease-in-out',
        'w-60',
        collapsed && 'lg:w-16',
        !collapsed && 'lg:w-60',
        !isLg && !mobileOpen && '-translate-x-full',
        'lg:translate-x-0'
      )}
    >
      {/* Logo + mobile close */}
      <div className={cn('flex items-center border-b border-slate-200/50 h-16', (collapsed && isLg) ? 'justify-center px-2' : 'px-5', !isLg && 'justify-between')}>
        {(collapsed && isLg) ? (
          <Image
            src="/assets/logo/logo-script-minder.png"
            alt="ScriptMe"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        ) : (
          <LogoStatic size="lg" variant="light" />
        )}
        {!isLg && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
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
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
                  Admin
                </p>
              )}
              {collapsed && <div className="border-t border-slate-200/50 mb-2" />}
            </div>
            {visibleAdmin.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-200/50 p-3 space-y-1">
        {/* User info — always show when sidebar expanded (mobile) or not collapsed (desktop) */}
        {(!collapsed || !isLg) && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-100/60 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-xs font-bold text-[#7C3AED] shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{user?.name ?? 'Loading…'}</div>
              <div className="text-xs text-slate-500 truncate capitalize">{roleName} Plan</div>
            </div>
          </div>
        )}
        {/* Logout */}
        <button
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-3 h-9 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 transition-all',
            collapsed && isLg && 'justify-center px-2'
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {(!collapsed || !isLg) && <span>Sign Out</span>}
        </button>
        {/* Collapse toggle — desktop only */}
        {isLg && (
          <button
            onClick={toggle}
            className={cn(
              'flex items-center gap-3 w-full rounded-xl px-3 h-9 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 transition-all',
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
        )}
      </div>
    </aside>

    {/* Project picker modal */}
    {pickerOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-300/30">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50">
            <h2 className="text-sm font-semibold text-slate-800">New Script — Pick a Project</h2>
            <button
              onClick={() => setPickerOpen(false)}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-3 max-h-72 overflow-y-auto">
            {pickerLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[#7C3AED]" />
              </div>
            )}
            {!pickerLoading && projects.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No projects yet.</p>
            )}
            {!pickerLoading && projects.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  setPickerOpen(false);
                  router.push(`/projects/${p._id}/scripts/new`);
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 transition-colors"
              >
                {p.title}
              </button>
            ))}
          </div>
          <div className="px-3 pb-3">
            <button
              onClick={() => { setPickerOpen(false); router.push('/projects/new'); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[#7C3AED] border border-[#7C3AED]/30 hover:bg-[#7C3AED]/10 transition-colors"
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

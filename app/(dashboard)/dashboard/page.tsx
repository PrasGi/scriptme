'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ProjectCard } from '@/components/dashboard/project-card';
import { Button } from '@/components/ui/button';
import {
  FileText, BarChart2, Users, Zap, ArrowRight, Plus, TrendingUp, Clock, Loader2,
  PenLine, Search, UserPlus, Sparkles,
} from 'lucide-react';

interface DashboardStats {
  totalScripts: number;
  scriptsReady: number;
  charactersCloned: number;
  totalProjects: number;
  tokenUsed: number;
  tokenLimit: number | null;
  userName: string;
  recentProjects: Array<{
    _id: string;
    title: string;
    description: string;
    status: string;
    platform: string;
    scripts: number;
    updatedAt: string;
  }>;
}

const quickActions = [
  { icon: PenLine, label: 'Generate Script', desc: 'Create from a topic', href: '/projects/new?type=generate', accent: '#06B6D4' },
  { icon: Search, label: 'Analyze Script', desc: 'Get AI feedback', href: '/projects/new?type=analyze', accent: '#10B981' },
  { icon: UserPlus, label: 'Clone Creator', desc: 'From video URL', href: '/characters/new', accent: '#A855F7' },
  { icon: Sparkles, label: 'Apply Character', desc: 'Rewrite your script', href: '/projects', accent: '#F59E0B' },
];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#06B6D4]" />
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const tokenDisplay =
    stats.tokenLimit != null
      ? `${formatTokens(stats.tokenUsed)} / ${formatTokens(stats.tokenLimit)}`
      : `${formatTokens(stats.tokenUsed)}`;

  const statsCards = [
    {
      title: 'Total Scripts',
      value: stats.totalScripts,
      change: stats.scriptsReady > 0 ? `${stats.scriptsReady} ready` : undefined,
      changeType: 'positive' as const,
      icon: FileText,
      accent: '#06B6D4',
    },
    {
      title: 'AI Tokens',
      value: tokenDisplay,
      change: stats.tokenLimit != null ? 'this month' : 'unlimited',
      changeType: 'neutral' as const,
      icon: BarChart2,
      accent: '#10B981',
    },
    {
      title: 'Characters Cloned',
      value: stats.charactersCloned,
      change: undefined,
      changeType: 'positive' as const,
      icon: Users,
      accent: '#A855F7',
    },
    {
      title: 'Projects',
      value: stats.totalProjects,
      change: undefined,
      changeType: 'positive' as const,
      icon: Zap,
      accent: '#F59E0B',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header: greeting + primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {stats.userName} 👋
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Overview of your content pipeline</p>
        </div>
        <Link href="/projects/new">
          <Button variant="cyan" size="md" className="gap-2 shrink-0">
            <Plus size={16} />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Quick Actions — above Recent Projects */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/6 bg-[#161B22] hover:border-white/12 hover:bg-white/4 transition-all group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${action.accent}20`, color: action.accent }}
                >
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-[#06B6D4] transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-[#8B949E] truncate">{action.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Recent Projects</h2>
          <Link href="/projects" className="flex items-center gap-1 text-sm text-[#06B6D4] hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {stats.recentProjects.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-[#161B22] p-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-[#8B949E]/40" />
            <p className="text-sm font-medium text-white mb-1">No projects yet</p>
            <p className="text-xs text-[#8B949E] mb-4">Create your first project to get started</p>
            <Link href="/projects/new">
              <Button variant="cyan" size="sm" className="gap-2">
                <Plus size={13} />
                New Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {stats.recentProjects.map((project) => (
              <ProjectCard
                key={project._id}
                title={project.title}
                description={project.description}
                status={project.status as 'draft' | 'analyzing' | 'ready' | 'published'}
                scripts={project.scripts}
                updatedAt={project.updatedAt}
                platform={project.platform}
                onClick={() => router.push(`/projects/${project._id}`)}
                onEdit={() => router.push(`/projects/${project._id}/edit`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI tip */}
      <div className="rounded-2xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/20 flex items-center justify-center text-[#06B6D4] shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">Tip from ScriptMinder AI</h3>
            <p className="text-sm text-[#8B949E] leading-relaxed">
              Your best-performing scripts start with a pattern-interrupt hook in the first 3 seconds.
              Try opening your next video with a shocking statistic or a bold counter-intuitive statement.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8B949E] shrink-0">
            <Clock size={12} />
            <span>Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

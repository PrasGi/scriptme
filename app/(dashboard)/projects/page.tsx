'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectCard } from '@/components/dashboard/project-card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Plus, Search, Grid, List, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProjectStatus   = 'draft' | 'analyzing' | 'ready' | 'published';
type ProjectPlatform = 'youtube' | 'tiktok' | 'instagram' | 'linkedin' | 'other';
type FilterType      = 'all' | ProjectStatus;

interface Project {
  _id:         string;
  title:       string;
  description: string;
  status:      ProjectStatus;
  platform:    ProjectPlatform;
  tags:        string[];
  updatedAt:   string;
  scripts?:    unknown[];
}

const filterOptions: { key: FilterType; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'ready',     label: 'Ready' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'draft',     label: 'Draft' },
  { key: 'published', label: 'Published' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<FilterType>('all');
  const [view,     setView]     = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProjects(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Manage all your video script projects</p>
        </div>
        <Tooltip content="New Project" description="Create a new project for your scripts" side="left">
          <Button variant="cyan" size="md" className="gap-2" onClick={() => router.push('/projects/new')}>
            <Plus size={16} />
            New Project
          </Button>
        </Tooltip>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-white/[0.06] bg-white/[0.03] text-sm text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#06B6D4]/40 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={cn(
                'px-3 h-8 rounded-lg text-xs font-medium border transition-all',
                filter === opt.key
                  ? 'bg-[#06B6D4]/10 border-[#06B6D4]/30 text-[#06B6D4]'
                  : 'bg-white/[0.03] border-white/[0.06] text-[#8B949E] hover:text-white hover:border-white/10'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto border border-white/[0.06] rounded-lg p-1">
          <Tooltip content="Grid view" description="Show projects in a grid layout" side="bottom">
            <button
              onClick={() => setView('grid')}
              className={cn('p-1.5 rounded', view === 'grid' ? 'bg-white/[0.08] text-white' : 'text-[#8B949E] hover:text-white')}
            >
              <Grid size={14} />
            </button>
          </Tooltip>
          <Tooltip content="List view" description="Show projects in a list layout" side="bottom">
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded', view === 'list' ? 'bg-white/[0.08] text-white' : 'text-[#8B949E] hover:text-white')}
            >
              <List size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6">
        <span className="text-sm text-[#8B949E]">
          <span className="text-white font-medium">{filtered.length}</span> projects
        </span>
        <span className="text-sm text-[#8B949E]">
          <span className="text-white font-medium">
            {projects.filter((p) => p.status === 'published').length}
          </span> published
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#06B6D4]" />
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className={cn('gap-4', view === 'grid' ? 'grid md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col')}>
          {filtered.map((project) => (
            <ProjectCard
              key={project._id}
              title={project.title}
              description={project.description}
              status={project.status}
              scripts={(project.scripts ?? []).length}
              updatedAt={timeAgo(project.updatedAt)}
              platform={project.platform}
              onClick={() => router.push(`/projects/${project._id}`)}
              onEdit={() => router.push(`/projects/${project._id}/edit`)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-white/[0.06] bg-[#161B22]">
          <div className="text-4xl mb-3">📁</div>
          <div className="text-base font-medium text-white mb-1">
            {projects.length === 0 ? 'No projects yet' : 'No projects found'}
          </div>
          <div className="text-sm text-[#8B949E] mb-4">
            {projects.length === 0
              ? 'Create your first project to get started'
              : 'Try adjusting your search or filters'}
          </div>
          {projects.length === 0 && (
            <Button variant="cyan" size="sm" className="gap-2" onClick={() => router.push('/projects/new')}>
              <Plus size={14} />
              New Project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

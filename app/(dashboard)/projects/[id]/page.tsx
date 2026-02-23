'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import {
  ArrowLeft, Plus, FileText, Clock, Loader2,
  MoreHorizontal, Trash2, ExternalLink, Edit2,
  AlertTriangle, X, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ProjectStatus = 'draft' | 'analyzing' | 'ready' | 'published';
type ScriptStatus  = 'draft' | 'analyzing' | 'ready';

interface Script {
  _id:       string;
  title:     string;
  status:    ScriptStatus;
  sourceType: string;
  lines:     unknown[];
  plainText: string;
  updatedAt: string;
}

interface Project {
  _id:         string;
  title:       string;
  description: string;
  platform:    string;
  status:      ProjectStatus;
  tags:        string[];
  scripts:     Script[];
  updatedAt:   string;
}

const projectStatusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'cyan' | 'green' | 'orange' | 'purple' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  analyzing: { label: 'Analyzing', variant: 'orange' },
  ready:     { label: 'Ready',     variant: 'cyan' },
  published: { label: 'Published', variant: 'green' },
};

const scriptStatusConfig: Record<ScriptStatus, { label: string; variant: 'default' | 'cyan' | 'green' | 'orange' | 'purple' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  analyzing: { label: 'Analyzing', variant: 'orange' },
  ready:     { label: 'Ready',     variant: 'cyan' },
};

const sourceTypeLabel: Record<string, string> = {
  manual: 'Manual',
  tiktok: 'TikTok',
  ai:     'AI',
};

const EXPORT_FORMATS = [
  { value: 'txt',  label: 'Plain Text (.txt)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'pdf',  label: 'PDF (.pdf)' },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0D1117] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#8B949E] hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [project,        setProject]        = useState<Project | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Script | null>(null);
  const [exportMenuId,   setExportMenuId]   = useState<string | null>(null);
  const exportMenuRef    = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setProject(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuId(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function exportScript(sid: string, format: string) {
    setExportMenuId(null);
    window.open(`/api/projects/${id}/scripts/${sid}/export?format=${format}`, '_blank');
  }

  async function deleteScript(sid: string) {
    setDeleting(sid);
    try {
      const res  = await fetch(`/api/projects/${id}/scripts/${sid}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setProject((prev) =>
          prev ? { ...prev, scripts: prev.scripts.filter((s) => s._id !== sid) } : prev
        );
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#06B6D4]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-32">
        <p className="text-[#8B949E]">Project not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const pst = projectStatusConfig[project.status];

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Tooltip content="Back to projects" description="Return to your project list" side="bottom">
          <button
            onClick={() => router.push('/projects')}
            className="mt-1 p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <ArrowLeft size={18} />
          </button>
        </Tooltip>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            <Badge variant={pst.variant}>{pst.label}</Badge>
            {project.platform !== 'other' && (
              <span className="text-xs text-[#8B949E] capitalize">{project.platform}</span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-[#8B949E] mt-1">{project.description}</p>
          )}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[#8B949E] text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip content="Edit Project" description="Change project settings and details" side="bottom">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/projects/${id}/edit`)}
            >
              <Edit2 size={14} />
              Edit Project
            </Button>
          </Tooltip>
          <Tooltip content="New Script" description="Add a new script to this project" side="bottom">
            <Button
              variant="cyan"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/projects/${id}/scripts/new`)}
            >
              <Plus size={14} />
              New Script
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Scripts section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Scripts
            <span className="ml-2 text-[#8B949E] font-normal">({project.scripts.length})</span>
          </h2>
        </div>

        {project.scripts.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-[#161B22]">
            <FileText size={32} className="mx-auto mb-3 text-[#8B949E]/40" />
            <p className="text-sm font-medium text-white mb-1">No scripts yet</p>
            <p className="text-xs text-[#8B949E] mb-4">Add your first script to this project</p>
            <Button
              variant="cyan"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/projects/${id}/scripts/new`)}
            >
              <Plus size={13} />
              New Script
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {project.scripts.map((script) => {
              const sst = scriptStatusConfig[script.status];
              return (
                <div
                  key={script._id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#161B22]',
                    'hover:border-white/[0.12] transition-all group'
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#06B6D4]/10 flex items-center justify-center text-[#06B6D4] shrink-0">
                    <FileText size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{script.title}</span>
                      <Badge variant={sst.variant} >{sst.label}</Badge>
                      <span className="text-xs text-[#8B949E]/60">{sourceTypeLabel[script.sourceType] ?? script.sourceType}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#8B949E] flex items-center gap-1">
                        <FileText size={11} />
                        {script.lines.length} lines
                      </span>
                      <span className="text-xs text-[#8B949E] flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(script.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push(`/projects/${id}/scripts/${script._id}`)}
                      className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all"
                      title="Open script"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(script)}
                      disabled={deleting === script._id}
                      className="p-1.5 rounded-lg text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete script"
                    >
                      {deleting === script._id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                    <div
                      className="relative"
                      ref={exportMenuId === script._id ? exportMenuRef : undefined}
                    >
                      <button
                        onClick={() => setExportMenuId((prev) => (prev === script._id ? null : script._id))}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all"
                        title="Export options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {exportMenuId === script._id && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/8 bg-[#161B22] shadow-xl z-10 overflow-hidden">
                          <div className="px-3 py-2 text-xs font-medium text-[#8B949E] border-b border-white/[0.06] flex items-center gap-1.5">
                            <Download size={12} />
                            Export
                          </div>
                          {EXPORT_FORMATS.map((f) => (
                            <button
                              key={f.value}
                              onClick={() => exportScript(script._id, f.value)}
                              className="w-full text-left px-4 py-2.5 text-sm text-[#8B949E] hover:text-white hover:bg-white/5 transition-colors"
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete script confirmation */}
      {deleteTarget && (
        <Modal title="Delete Script" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#8B949E]">
                Delete script <span className="text-white font-medium">{deleteTarget.title}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={deleting === deleteTarget._id}
                onClick={() => deleteScript(deleteTarget._id)}
              >
                {deleting === deleteTarget._id ? (
                  <><Loader2 size={14} className="animate-spin" /> Deleting…</>
                ) : (
                  'Delete Script'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

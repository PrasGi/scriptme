'use client';

import { useState, useEffect, useLayoutEffect, useRef, use } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import {
  ArrowLeft, Plus, FileText, Clock, Loader2,
  MoreHorizontal, Trash2, ExternalLink, Edit2,
  AlertTriangle, X, Download, Braces, FileType, FileImage,
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

const projectStatusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'accent' | 'green' | 'orange' | 'purple' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  analyzing: { label: 'Analyzing', variant: 'orange' },
  ready:     { label: 'Ready',     variant: 'accent' },
  published: { label: 'Published', variant: 'green' },
};

const scriptStatusConfig: Record<ScriptStatus, { label: string; variant: 'default' | 'accent' | 'green' | 'orange' | 'purple' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  analyzing: { label: 'Analyzing', variant: 'orange' },
  ready:     { label: 'Ready',     variant: 'accent' },
};

const sourceTypeLabel: Record<string, string> = {
  manual: 'Manual',
  tiktok: 'TikTok',
  ai:     'AI',
};

const EXPORT_FORMATS = [
  { value: 'txt',  label: 'Plain text',  description: 'Timestamped .txt',       icon: FileText },
  { value: 'json', label: 'JSON',        description: 'Structured data',        icon: Braces },
  { value: 'docx', label: 'Word document', description: 'Editable .docx',      icon: FileType },
  { value: 'pdf',  label: 'PDF',         description: 'Print-ready with logo',    icon: FileImage },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-300/30">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X size={18} /></button>
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
  const [exportMenuRect, setExportMenuRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const exportMenuRef    = useRef<HTMLDivElement | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (exportMenuId) {
      const rect = exportMenuRef.current?.getBoundingClientRect();
      setExportMenuRect(rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null);
    } else {
      setExportMenuRect(null);
    }
  }, [exportMenuId]);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setProject(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        exportMenuRef.current?.contains(target) ||
        exportDropdownRef.current?.contains(target)
      ) return;
      setExportMenuId(null);
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
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">Project not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const pst = projectStatusConfig[project.status];

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <Tooltip content="Back to projects" description="Return to your project list" side="bottom">
          <button
            onClick={() => router.push('/projects')}
            className="mt-1 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
        </Tooltip>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate min-w-0">{project.title}</h1>
            <Badge variant={pst.variant}>{pst.label}</Badge>
            {project.platform !== 'other' && (
              <span className="text-xs text-slate-500 capitalize">{project.platform}</span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-slate-500 mt-1">{project.description}</p>
          )}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-600 text-xs">
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
              className="gap-1.5 sm:gap-2"
              onClick={() => router.push(`/projects/${id}/edit`)}
            >
              <Edit2 size={14} />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </Tooltip>
          <Tooltip content="New Script" description="Add a new script to this project" side="bottom">
            <Button
              variant="accent"
              size="sm"
              className="gap-1.5 sm:gap-2"
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
          <h2 className="text-sm font-semibold text-slate-800">
            Scripts
            <span className="ml-2 text-slate-500 font-normal">({project.scripts.length})</span>
          </h2>
        </div>

        {project.scripts.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md shadow-sm shadow-slate-200/20">
            <FileText size={32} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-medium text-slate-800 mb-1">No scripts yet</p>
            <p className="text-xs text-slate-500 mb-4">Add your first script to this project</p>
            <Button
              variant="accent"
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
                    'flex items-center gap-3 sm:gap-4 px-4 py-3 sm:p-4 rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md',
                    'hover:border-slate-300/60 hover:bg-white/80 transition-all group shadow-sm shadow-slate-200/20'
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] shrink-0">
                    <FileText size={16} />
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap gap-y-1">
                      <span className="text-sm font-medium text-slate-800 truncate min-w-0 max-w-full" title={script.title}>{script.title}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={sst.variant}>{sst.label}</Badge>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{sourceTypeLabel[script.sourceType] ?? script.sourceType}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <FileText size={11} />
                        {script.lines.length} lines
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(script.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push(`/projects/${id}/scripts/${script._id}`)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all"
                      title="Open script"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(script)}
                      disabled={deleting === script._id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
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
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all"
                        title="Export options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export dropdown portal */}
      {exportMenuId && exportMenuRect && typeof document !== 'undefined' && createPortal(
        <div
          ref={exportDropdownRef}
          className="fixed min-w-[220px] w-56 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-300/30 z-[9999] overflow-hidden py-2"
          style={{
            top: exportMenuRect.top + exportMenuRect.height + 4,
            left: Math.max(8, exportMenuRect.left + exportMenuRect.width - 224),
          }}
        >
          <div className="px-3 py-1.5 mb-1 text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Download size={12} />
            Export
          </div>
          {EXPORT_FORMATS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => exportScript(exportMenuId, f.value)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg mx-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50/90 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/80">
                  <Icon size={16} className="text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-slate-500 truncate">{f.description}</p>
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}

      {/* Delete script confirmation */}
      {deleteTarget && (
        <Modal title="Delete Script" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">
                Delete script <span className="text-slate-800 font-medium">{deleteTarget.title}</span>? This action cannot be undone.
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

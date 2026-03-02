'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FolderPlus, Loader2, X } from 'lucide-react';

type Platform = 'youtube' | 'tiktok' | 'instagram' | 'linkedin' | 'other';

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'youtube',   label: 'YouTube' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'other',     label: 'Other' },
];

const statusOptions: { value: string; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'ready',     label: 'Ready' },
  { value: 'published', label: 'Published' },
];

interface Project {
  _id:         string;
  title:       string;
  description: string;
  platform:    Platform;
  status:      string;
  tags:        string[];
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<Platform>('other');
  const [status, setStatus] = useState('draft');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const p = json.data;
          setProject(p);
          setTitle(p.title ?? '');
          setDescription(p.description ?? '');
          setPlatform(p.platform ?? 'other');
          setStatus(p.status ?? 'draft');
          setTags(p.tags ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,/g, '');
      if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       title.trim(),
          description: description.trim(),
          platform,
          status,
          tags,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to update project');
      } else {
        router.push(`/projects/${id}`);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
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

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/projects/${id}`)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderPlus size={22} className="text-[#7C3AED]" />
            Edit Project
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Update project details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md p-6 space-y-5 shadow-sm shadow-slate-200/20">

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Project Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Morning Routine Tips"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-white/80 border-slate-200/60 text-slate-800"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Description</label>
          <textarea
            placeholder="What is this project about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#7C3AED]/50 transition-colors resize-none"
          />
        </div>

        {/* Platform */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Platform</label>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlatform(opt.value)}
                className={`px-4 h-9 rounded-xl text-sm font-medium border transition-all ${
                  platform === opt.value
                    ? 'bg-[#7C3AED]/15 border-[#7C3AED]/40 text-[#7C3AED]'
                    : 'bg-slate-100/60 border-slate-200/50 text-slate-600 hover:text-slate-800 hover:border-slate-300/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`px-4 h-9 rounded-xl text-sm font-medium border transition-all ${
                  status === opt.value
                    ? 'bg-[#7C3AED]/15 border-[#7C3AED]/40 text-[#7C3AED]'
                    : 'bg-slate-100/60 border-slate-200/50 text-slate-600 hover:text-slate-800 hover:border-slate-300/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tags <span className="text-slate-400 normal-case font-normal">(press Enter to add)</span>
          </label>
          <div className="flex flex-wrap gap-2 min-h-[38px] rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 focus-within:border-[#7C3AED]/50 transition-colors">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7C3AED]/10 text-[#7C3AED] text-xs border border-[#7C3AED]/20"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-slate-800 transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder={tags.length === 0 ? 'Add tags...' : ''}
              className="flex-1 min-w-[80px] bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            variant="accent"
            disabled={saving || !title.trim()}
            className="gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push(`/projects/${id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

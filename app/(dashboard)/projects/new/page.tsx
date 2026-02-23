'use client';

import { useState } from 'react';
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

export default function NewProjectPage() {
  const router = useRouter();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [platform,    setPlatform]    = useState<Platform>('other');
  const [tagInput,    setTagInput]    = useState('');
  const [tags,        setTags]        = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

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

    setLoading(true);
    setError('');

    try {
      const res  = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), description: description.trim(), platform, tags }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to create project');
      } else {
        router.push(`/projects/${json.data._id}`);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderPlus size={22} className="text-[#06B6D4]" />
            New Project
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Create a new video script project</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.06] bg-[#0D1117] p-6 space-y-5">

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
            Project Title <span className="text-red-400">*</span>
          </label>
          <Input
            placeholder="e.g. Morning Routine Tips"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-[#161B22] border-white/[0.08]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">Description</label>
          <textarea
            placeholder="What is this project about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2.5 text-sm text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#06B6D4]/50 transition-colors resize-none"
          />
        </div>

        {/* Platform */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">Platform</label>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlatform(opt.value)}
                className={`px-4 h-9 rounded-xl text-sm font-medium border transition-all ${
                  platform === opt.value
                    ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40 text-[#06B6D4]'
                    : 'bg-white/[0.03] border-white/[0.06] text-[#8B949E] hover:text-white hover:border-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
            Tags <span className="text-[#8B949E]/50 normal-case font-normal">(press Enter to add)</span>
          </label>
          <div className="flex flex-wrap gap-2 min-h-[38px] rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 focus-within:border-[#06B6D4]/50 transition-colors">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#06B6D4]/10 text-[#06B6D4] text-xs border border-[#06B6D4]/20"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder={tags.length === 0 ? 'Add tags...' : ''}
              className="flex-1 min-w-[80px] bg-transparent text-sm text-white placeholder:text-[#8B949E]/60 outline-none"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            variant="cyan"
            disabled={loading || !title.trim()}
            className="gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
            {loading ? 'Creating…' : 'Create Project'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

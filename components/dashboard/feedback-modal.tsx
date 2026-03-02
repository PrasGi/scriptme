'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter your feedback.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        setSent(true);
        setMessage('');
        setTimeout(() => {
          setSent(false);
          onClose();
        }, 1500);
      } else {
        setError(json.message ?? 'Failed to send feedback');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setMessage('');
    setError('');
    setSent(false);
    onClose();
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={handleClose}
        onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/85 backdrop-blur-xl shadow-2xl shadow-slate-300/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200/50 px-5 py-4">
          <h2 id="feedback-title" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-[#7C3AED]" />
            Send feedback
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[#7C3AED] font-medium">Thanks! Your feedback has been sent to the team.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-700 mb-1.5">
                Your feedback
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think, report a bug, or suggest an improvement..."
                rows={4}
                className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#7C3AED]/50 resize-none"
                disabled={submitting}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" size="sm" disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Send feedback'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

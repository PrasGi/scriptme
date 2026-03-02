import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strip HTML tags from a string, preserving readable text.
 * Handles <br>, closing block tags as newlines, and common HTML entities.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Wrap plain text in a <p> tag if it doesn't already contain HTML.
 * Ensures Tiptap can parse the content correctly.
 */
export function ensureHtml(text: string): string {
  if (!text) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return `<p>${text}</p>`;
}

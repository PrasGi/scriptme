'use client';

import { useEffect, useRef, useCallback } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const LOCALSTORAGE_KEY = 'tutorial_completed';

interface ScriptTutorialProps {
  shouldRun: boolean;
  onComplete: () => void;
}

function forceShow(selector: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (el) el.style.opacity = '1';
}

function forceHide(selector: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (el) el.style.opacity = '';
}

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to the Script Editor',
      description:
        'This is where you write, edit, and refine your scripts with AI assistance. Let me give you a quick tour of the key features.',
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '#tour-script-lines',
    popover: {
      title: 'Script Lines',
      description:
        'Write your script here line by line. Each line has timestamps and a rich text editor.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#tour-first-line',
    popover: {
      title: 'Rich Text Formatting',
      description:
        'Select any text in a line to reveal a floating toolbar with Bold (Ctrl+B), Italic (Ctrl+I), Underline, Strikethrough, and text colors. You can also use the toolbar\'s "Ask AI" button to send your selection as context to the AI chat.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-add-to-chat',
    popover: {
      title: 'Add Line to AI Chat',
      description:
        'This icon appears when you hover over a line. Click it to send the entire line as context to the AI chat. You can also drag it into the chat panel. Add multiple lines for more targeted AI help.',
      side: 'left',
      align: 'center',
    },
    onHighlightStarted: () => forceShow('#tour-add-to-chat'),
    onDeselected: () => forceHide('#tour-add-to-chat'),
  },
  {
    element: '#tour-line-actions',
    popover: {
      title: 'Line Actions',
      description:
        'Hover any line to reveal these action buttons. Use the tag icon to flag a line with a color, or the trash icon to delete it.',
      side: 'left',
      align: 'center',
    },
    onHighlightStarted: () => forceShow('#tour-line-actions'),
    onDeselected: () => forceHide('#tour-line-actions'),
  },
  {
    element: '#tour-character-select',
    popover: {
      title: 'Character Selection',
      description:
        'Pick a character to set the tone and style for AI responses. The AI will write and give feedback matching your character\'s personality.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-ai-chat',
    popover: {
      title: 'AI Chat Panel',
      description:
        'Chat with AI to get writing help, rewrite lines, or brainstorm ideas. The AI knows your current script and selected character. You can accept or reject individual line suggestions.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-analyze-btn',
    popover: {
      title: 'Analyze Script',
      description:
        'Run a full AI analysis on your script to get line-by-line improvement suggestions. Each suggestion can be applied or dismissed individually.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-export-btn',
    popover: {
      title: 'Export Script',
      description:
        'Download your script in different formats — Plain Text, JSON, Word, or PDF.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-readmode-btn',
    popover: {
      title: 'Read Mode',
      description:
        'Preview your script in a focused, cinematic reading view — great for rehearsing or reviewing the final result.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-save-btn',
    popover: {
      title: 'Save Your Work',
      description:
        'Don\'t forget to save! Your script also auto-saves in the background while editing.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'You\'re All Set!',
      description:
        'That\'s everything you need to get started. You can replay this tutorial anytime from the help button in the header. Happy writing!',
      side: 'over',
      align: 'center',
    },
  },
];

export function ScriptTutorial({ shouldRun, onComplete }: ScriptTutorialProps) {
  const driverRef = useRef<Driver | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const markComplete = useCallback(() => {
    localStorage.setItem(LOCALSTORAGE_KEY, 'true');
    fetch('/api/users/tutorial', { method: 'PATCH' }).catch(() => {});
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (!shouldRun) return;

    const timeout = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayColor: 'rgba(15, 15, 30, 0.65)',
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: 'script-tutorial-popover',
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Done',
        progressText: '{{current}} of {{total}}',
        steps: TOUR_STEPS,
        onDestroyStarted: () => {
          markComplete();
          driverObj.destroy();
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 800);

    return () => {
      clearTimeout(timeout);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [shouldRun, markComplete]);

  return null;
}

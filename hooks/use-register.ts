'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import type { ApiResponse } from '@/lib/response';

interface RegisterState {
  isLoading:   boolean;
  error:       string | null;
  fieldErrors: Record<string, string>;
}

interface RegisterInput {
  name:     string;
  email:    string;
  password: string;
  redirect?: string;
}

/**
 * Hook for user registration.
 * POSTs to /api/auth/register, then auto-signs-in on success.
 */
export function useRegister() {
  const [state, setState] = useState<RegisterState>({
    isLoading:   false,
    error:       null,
    fieldErrors: {},
  });

  async function register({ name, email, password, redirect = '/dashboard' }: RegisterInput) {
    setState({ isLoading: true, error: null, fieldErrors: {} });

    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      });

      const json: ApiResponse = await res.json();

      if (!json.success) {
        if (json.errors) {
          // 422 validation errors per field — show all messages
          const fieldErrors: Record<string, string> = {};
          Object.entries(json.errors).forEach(([k, msgs]) => {
            const arr = Array.isArray(msgs) ? msgs : [msgs];
            fieldErrors[k] = arr.join('. ');
          });
          setState({ isLoading: false, error: null, fieldErrors });
        } else {
          setState({ isLoading: false, fieldErrors: {}, error: json.message });
        }
        return;
      }

      // Auto sign-in after successful registration
      const result = await signIn('credentials', { email, password, redirect: false });

      if (result?.error) {
        setState({ isLoading: false, fieldErrors: {}, error: 'Account created. Please sign in.' });
        return;
      }

      // Force full navigation to dashboard
      window.location.href = redirect;
    } catch {
      setState({ isLoading: false, fieldErrors: {}, error: 'Network error. Please try again.' });
    }
  }

  function clearError() {
    setState((s) => ({ ...s, error: null, fieldErrors: {} }));
  }

  function setFieldErrors(errors: Record<string, string>) {
    setState((s) => ({ ...s, error: null, fieldErrors: errors }));
  }

  return { ...state, register, clearError, setFieldErrors };
}

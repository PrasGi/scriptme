'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { validateLogin } from '@/app/api/auth/login/validation';

interface LoginState {
  isLoading:  boolean;
  error:      string | null;
  fieldErrors: Record<string, string>;
}

interface LoginInput {
  email:    string;
  password: string;
  redirect?: string;
}

/**
 * Hook for credentials login via NextAuth.
 * Validates locally first, then calls NextAuth signIn (redirect: false).
 * On success uses router.push + refresh (same pattern as paralyze).
 */
export function useLogin() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({
    isLoading:   false,
    error:       null,
    fieldErrors: {},
  });

  async function login({ email, password, redirect = '/dashboard' }: LoginInput) {
    const parsed = validateLogin({ email, password });
    if (!parsed.ok) {
      const fieldErrors: Record<string, string> = {};
      Object.entries(parsed.errors).forEach(([k, msgs]) => {
        fieldErrors[k] = msgs[0];
      });
      setState((s) => ({ ...s, fieldErrors, error: null }));
      return;
    }

    setState({ isLoading: true, error: null, fieldErrors: {} });

    try {
      const result = await signIn('credentials', {
        email:    parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        setState({
          isLoading:   false,
          fieldErrors: {},
          error:       'Invalid email or password',
        });
        return;
      }

      if (result?.ok) {
        setState((s) => ({ ...s, isLoading: false }));
        window.location.href = redirect;
        return;
      }

      // signIn() may not return result.ok even when login succeeded. Check session and redirect if user exists.
      const sessionRes = await fetch('/api/auth/session');
      const data = sessionRes.ok ? await sessionRes.json() : null;
      if (sessionRes.ok && data?.user?.id) {
        setState((s) => ({ ...s, isLoading: false }));
        window.location.href = redirect;
        return;
      }

      setState({
        isLoading:   false,
        fieldErrors: {},
        error:       'Sign-in failed. Please try again.',
      });
    } catch {
      setState({
        isLoading:   false,
        fieldErrors: {},
        error:       'Sign-in failed. Please try again.',
      });
    }
  }

  async function loginWithGoogle(redirect = '/dashboard') {
    await signIn('google', { callbackUrl: redirect });
  }

  async function loginWithGitHub(redirect = '/dashboard') {
    await signIn('github', { callbackUrl: redirect });
  }

  function clearError() {
    setState((s) => ({ ...s, error: null, fieldErrors: {} }));
  }

  return { ...state, login, loginWithGoogle, loginWithGitHub, clearError };
}

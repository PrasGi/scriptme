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
 * Validates locally first, then calls NextAuth signIn.
 */
export function useLogin() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({
    isLoading:   false,
    error:       null,
    fieldErrors: {},
  });

  async function login({ email, password, redirect = '/dashboard' }: LoginInput) {
    // Client-side validation
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
      router.push(redirect);
      router.refresh();
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

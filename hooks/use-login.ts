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

      // #region agent log
      (function(){const p={sessionId:'4d1c77',location:'use-login.ts:after signIn',message:'signIn result',data:{hasResult:!!result,ok:!!result?.ok,error:result?.error,keys:result?Object.keys(result):[]},timestamp:Date.now(),hypothesisId:'H1-H5'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
      // #endregion

      if (result?.error) {
        setState({
          isLoading:   false,
          fieldErrors: {},
          error:       'Invalid email or password',
        });
        return;
      }

      if (result?.ok) {
        // #region agent log
        (function(){const p={sessionId:'4d1c77',location:'use-login.ts:result.ok branch',message:'calling window.location.href (full page nav)',data:{redirect},timestamp:Date.now(),hypothesisId:'H2-H4-fix',runId:'post-fix'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
        // #endregion
        setState((s) => ({ ...s, isLoading: false }));
        // Full page navigation so the first dashboard request sends the session cookie (router.push RSC request was not including it, causing middleware to redirect back to login)
        window.location.href = redirect;
        return;
      }

      // signIn() may not return result.ok even when login succeeded (e.g. redirect response). Check session.
      // #region agent log
      (function(){const p={sessionId:'4d1c77',location:'use-login.ts:session fallback',message:'fetching session',data:{},timestamp:Date.now(),hypothesisId:'H1'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
      // #endregion
      const sessionRes = await fetch('/api/auth/session');
      const data = sessionRes.ok ? await sessionRes.json() : null;
      // #region agent log
      (function(){const p={sessionId:'4d1c77',location:'use-login.ts:after session fetch',message:'session response',data:{sessionResOk:sessionRes.ok,hasUser:!!data?.user?.id},timestamp:Date.now(),hypothesisId:'H1-H4'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
      // #endregion
      if (sessionRes.ok && data?.user?.id) {
        // #region agent log
        (function(){const p={sessionId:'4d1c77',location:'use-login.ts:window.location from session',message:'calling window.location.href',data:{redirect},timestamp:Date.now(),hypothesisId:'H2-H4',runId:'post-fix'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
        // #endregion
        setState((s) => ({ ...s, isLoading: false }));
        window.location.href = redirect;
        return;
      }

      // #region agent log
      (function(){const p={sessionId:'4d1c77',location:'use-login.ts:sign-in failed branch',message:'no ok and no session user',data:{},timestamp:Date.now(),hypothesisId:'H1'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
      // #endregion
      setState({
        isLoading:   false,
        fieldErrors: {},
        error:       'Sign-in failed. Please try again.',
      });
    } catch (e) {
      // #region agent log
      (function(){const p={sessionId:'4d1c77',location:'use-login.ts:catch',message:'login catch',data:{errMsg:e instanceof Error?e.message:String(e)},timestamp:Date.now(),hypothesisId:'H3'};console.log('[debug 4d1c77]',p);fetch('http://127.0.0.1:7469/ingest/452e1154-ea43-41e8-a4f1-9e500b19d198',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d1c77'},body:JSON.stringify(p)}).catch(()=>{});})();
      // #endregion
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

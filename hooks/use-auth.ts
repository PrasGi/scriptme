'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Core auth hook — wraps NextAuth useSession with convenience helpers.
 * Provides typed access to user, session state, and auth actions.
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const user        = session?.user ?? null;
  const isLoading   = status === 'loading';
  const isAuth      = status === 'authenticated';
  const isAnon      = status === 'unauthenticated';

  async function logout(redirectTo = '/login') {
    await signOut({ redirect: false });
    router.push(redirectTo);
    router.refresh();
  }

  return { user, session, isLoading, isAuth, isAnon, logout, updateSession: update };
}

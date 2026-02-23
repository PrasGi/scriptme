'use client';

import { useAuth } from './use-auth';

/**
 * Checks permissions from the JWT session (no extra API calls).
 * Permissions are stored as "resource:action:scope" strings.
 *
 * hasPermission('project', 'create')       → checks project:create:own or project:create:all
 * hasPermission('project', 'read', 'all')  → checks only project:read:all
 */
export function usePermissions() {
  const { user } = useAuth();
  const permissions: string[] = user?.permissions ?? [];

  function hasPermission(resource: string, action: string, scope?: 'own' | 'all'): boolean {
    if (!permissions.length) return false;

    if (scope) {
      return permissions.includes(`${resource}:${action}:${scope}`);
    }

    // If no scope specified, match either own or all
    return (
      permissions.includes(`${resource}:${action}:own`) ||
      permissions.includes(`${resource}:${action}:all`)
    );
  }

  function hasAnyPermission(...keys: string[]): boolean {
    return keys.some((key) => {
      const [res, act, sc] = key.split(':');
      return hasPermission(res, act, sc as 'own' | 'all' | undefined);
    });
  }

  function isAdmin(): boolean {
    return user?.roleName === 'admin';
  }

  return { permissions, hasPermission, hasAnyPermission, isAdmin };
}

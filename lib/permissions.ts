import { connectDB } from '@/lib/db';
import RolePermission from '@/models/role-permission.model';
import UserPermission from '@/models/user-permission.model';
import Permission, { IPermission } from '@/models/permission.model';
import { Types } from 'mongoose';

export interface ResolvedPermission {
  resource: string;
  action:   string;
  scope:    string;
}

/**
 * Resolve all effective permissions for a user.
 * Logic:
 *   1. Collect role's default permissions (via RolePermission)
 *   2. Apply user-level overrides (UserPermission.granted = true|false)
 */
export async function getUserPermissions(
  userId: string,
  roleId: string
): Promise<ResolvedPermission[]> {
  await connectDB();

  // 1. Role permissions
  // Pass model directly to avoid Mongoose registry lookup failures in Next.js
  const rolePerms = await RolePermission.find({
    roleId: new Types.ObjectId(roleId),
  }).populate<{ permissionId: IPermission }>({ path: 'permissionId', model: Permission });

  const permMap = new Map<string, ResolvedPermission>();
  for (const rp of rolePerms) {
    const p = rp.permissionId as IPermission;
    const key = `${p.resource}:${p.action}:${p.scope}`;
    permMap.set(key, { resource: p.resource, action: p.action, scope: p.scope });
  }

  // 2. User overrides
  const userPerms = await UserPermission.find({
    userId: new Types.ObjectId(userId),
  }).populate<{ permissionId: IPermission }>({ path: 'permissionId', model: Permission });

  for (const up of userPerms) {
    const p = up.permissionId as IPermission;
    const key = `${p.resource}:${p.action}:${p.scope}`;
    if (up.granted) {
      permMap.set(key, { resource: p.resource, action: p.action, scope: p.scope });
    } else {
      permMap.delete(key); // explicitly revoked
    }
  }

  return Array.from(permMap.values());
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(
  userId: string,
  roleId: string,
  resource: string,
  action: string,
  scope?: 'own' | 'all'
): Promise<boolean> {
  const perms = await getUserPermissions(userId, roleId);
  return perms.some(
    (p) =>
      p.resource === resource &&
      p.action === action &&
      (scope === undefined || p.scope === scope || p.scope === 'all')
  );
}

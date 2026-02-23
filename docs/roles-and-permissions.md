# Roles & Permissions (RBAC)

ScriptMinder uses a **Role-Based Access Control (RBAC)** system with per-user override support. Every user belongs to one role, and each role carries a set of permissions. Individual permissions can then be granted or revoked at the user level on top of the role baseline.

---

## Table of Contents

- [Data Model](#data-model)
  - [Permission](#permission)
  - [Role](#role)
  - [RolePermission](#rolepermission)
  - [UserPermission](#userpermission)
- [Permission Key Format](#permission-key-format)
- [Built-in Roles](#built-in-roles)
- [Built-in Permissions](#built-in-permissions)
- [Permission Resolution Logic](#permission-resolution-logic)
- [Backend Usage](#backend-usage)
  - [Check inside an API route](#check-inside-an-api-route)
  - [Get all user permissions](#get-all-user-permissions)
- [Frontend Usage](#frontend-usage)
  - [usePermissions hook](#usepermissions-hook)
  - [Conditional UI rendering](#conditional-ui-rendering)
- [Adding a New Permission](#adding-a-new-permission)
- [Adding a New Role](#adding-a-new-role)
- [Per-User Overrides](#per-user-overrides)
- [File Map](#file-map)

---

## Data Model

### Permission

File: [`models/permission.model.ts`](../models/permission.model.ts)

```
Permission {
  resource:    string     → the domain being protected (e.g. "project", "user")
  action:      string     → the operation (e.g. "create", "read", "update", "delete")
  scope:       "own"|"all" → "own" = only user's own data, "all" = any user's data
  description: string     → human-readable explanation
}
```

Unique compound index on `{ resource, action, scope }` — no duplicate permissions.

### Role

File: [`models/role.model.ts`](../models/role.model.ts)

```
Role {
  name:        string     → unique role name (e.g. "admin", "creator", "viewer")
  description: string
  isDefault:   boolean    → if true, newly registered users are assigned this role
}
```

Only one role should have `isDefault: true` at a time. Currently that is `creator`.

### RolePermission

File: [`models/role-permission.model.ts`](../models/role-permission.model.ts)

```
RolePermission {
  roleId:       ObjectId → ref Role
  permissionId: ObjectId → ref Permission
}
```

This is a many-to-many join. A role gains permissions by having entries here.  
Unique compound index on `{ roleId, permissionId }`.

### UserPermission

File: [`models/user-permission.model.ts`](../models/user-permission.model.ts)

```
UserPermission {
  userId:       ObjectId → ref User
  permissionId: ObjectId → ref Permission
  granted:      boolean  → true = add this permission, false = revoke it
}
```

Used to override the role's defaults for a specific user.  
Unique compound index on `{ userId, permissionId }`.

---

## Permission Key Format

All permissions are expressed as a colon-separated string throughout the codebase:

```
"{resource}:{action}:{scope}"
```

Examples:

```
project:create:own      → create your own projects
project:read:all        → read any user's projects
user:delete:all         → delete any user account
billing:update:own      → update own billing info
role:create:all         → create new roles (admin only)
```

This format is what gets stored in the JWT's `permissions[]` array and what the `usePermissions()` hook reads.

---

## Built-in Roles

Seeded by [`scripts/seed.ts`](../scripts/seed.ts).

### `admin`
Full access. Receives **all 28 permissions** across all resources.

### `creator` *(default for new registrations)*
Standard creator access. Can manage their own content:

| Permission | Description |
|---|---|
| `project:create:own` | Create own projects |
| `project:read:own` | Read own projects |
| `project:update:own` | Update own projects |
| `project:delete:own` | Delete own projects |
| `character:create:own` | Create own characters |
| `character:read:own` | Read own characters |
| `character:update:own` | Update own characters |
| `character:delete:own` | Delete own characters |
| `billing:read:own` | View own billing |
| `billing:update:own` | Update own billing |
| `analytics:read:own` | View own analytics |
| `user:read:own` | Read own profile |
| `user:update:own` | Update own profile |

### `viewer`
Read-only access to own content:

| Permission | Description |
|---|---|
| `project:read:own` | Read own projects |
| `character:read:own` | Read own characters |
| `analytics:read:own` | View own analytics |
| `user:read:own` | Read own profile |

---

## Built-in Permissions

All 28 permissions across 6 resources:

### `project`
| Key | Description |
|---|---|
| `project:create:own` | Create own projects |
| `project:read:own` | Read own projects |
| `project:read:all` | Read all projects |
| `project:update:own` | Update own projects |
| `project:update:all` | Update any project |
| `project:delete:own` | Delete own projects |
| `project:delete:all` | Delete any project |

### `character`
| Key | Description |
|---|---|
| `character:create:own` | Create own characters |
| `character:read:own` | Read own characters |
| `character:read:all` | Read all characters |
| `character:update:own` | Update own characters |
| `character:delete:own` | Delete own characters |
| `character:delete:all` | Delete any character |

### `billing`
| Key | Description |
|---|---|
| `billing:read:own` | View own billing |
| `billing:read:all` | View all billing |
| `billing:update:own` | Update own billing |
| `billing:update:all` | Update any billing |

### `analytics`
| Key | Description |
|---|---|
| `analytics:read:own` | View own analytics |
| `analytics:read:all` | View all analytics |

### `user`
| Key | Description |
|---|---|
| `user:read:own` | Read own profile |
| `user:read:all` | Read all users |
| `user:update:own` | Update own profile |
| `user:update:all` | Update any user |
| `user:delete:all` | Delete any user |

### `role`
| Key | Description |
|---|---|
| `role:create:all` | Create roles |
| `role:read:all` | Read all roles |
| `role:update:all` | Update any role |
| `role:delete:all` | Delete any role |

---

## Permission Resolution Logic

File: [`lib/permissions.ts`](../lib/permissions.ts)

When a user logs in, their effective permissions are computed with this logic:

```
Step 1: Fetch all RolePermissions for the user's role
        → builds a Map<"resource:action:scope", PermissionObject>

Step 2: Fetch all UserPermissions for this specific user
        → for each entry:
            if granted = true  → ADD permission to the map (even if role doesn't have it)
            if granted = false → DELETE permission from the map (revoke even if role has it)

Step 3: Return Array.from(map.values())
```

This means:
- A user can have **extra** permissions beyond their role (`granted: true`)
- A user can have permissions **removed** that their role normally has (`granted: false`)

The result is embedded into the JWT at login time as an array of permission key strings.

---

## Backend Usage

### Check inside an API route

```ts
// app/api/projects/route.ts
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import { forbidden, unauthorized, ok } from '@/lib/response';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id: userId, roleId } = session.user;

  // Check if user can create their own projects
  const canCreate = await hasPermission(userId, roleId, 'project', 'create', 'own');
  if (!canCreate) return forbidden('You do not have permission to create projects');

  // ... create project logic
  return ok({ message: 'Project created' });
}
```

> **Note:** `hasPermission()` makes a DB call. For hot paths where you need performance,
> check `session.user.permissions` (the pre-loaded array) directly instead.

### Using the pre-loaded permissions array (no DB call)

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { permissions } = session.user;

  // Quick check without hitting the DB
  const canReadAll = permissions.includes('project:read:all');
  if (!canReadAll) return forbidden();

  return ok({ projects: [] });
}
```

### Get all user permissions

```ts
import { getUserPermissions } from '@/lib/permissions';

const perms = await getUserPermissions(userId, roleId);
// Returns: [{ resource: 'project', action: 'create', scope: 'own' }, ...]
```

---

## Frontend Usage

### `usePermissions` hook

File: [`hooks/use-permissions.ts`](../hooks/use-permissions.ts)

Reads directly from the JWT in the client session — **no API call**.

```ts
import { usePermissions } from '@/hooks/use-permissions';

const { hasPermission, hasAnyPermission, isAdmin, permissions } = usePermissions();
```

| Function | Signature | Description |
|---|---|---|
| `hasPermission` | `(resource, action, scope?) => boolean` | Check one permission |
| `hasAnyPermission` | `(...keys: string[]) => boolean` | True if user has at least one of the given keys |
| `isAdmin` | `() => boolean` | True if `roleName === "admin"` |
| `permissions` | `string[]` | Raw array of all permission keys |

#### `hasPermission` examples

```ts
// Check with explicit scope
hasPermission('project', 'read', 'own')  // → true/false
hasPermission('project', 'read', 'all')  // → true/false

// Check without scope — matches EITHER "own" OR "all"
hasPermission('project', 'read')         // → true if user has read:own or read:all
```

#### `hasAnyPermission` example

```ts
// True if user can delete their own OR any project
hasAnyPermission('project:delete:own', 'project:delete:all')
```

### Conditional UI rendering

```tsx
'use client';
import { usePermissions } from '@/hooks/use-permissions';

export function ProjectActions({ ownerId }: { ownerId: string }) {
  const { hasPermission, isAdmin } = usePermissions();
  const { user } = useAuth();

  const isOwner = user?.id === ownerId;

  return (
    <div>
      {/* Show edit button only if user owns the project or is admin */}
      {(isOwner && hasPermission('project', 'update', 'own')) || isAdmin() ? (
        <button>Edit Project</button>
      ) : null}

      {/* Show delete button only for admins or project owners */}
      {hasPermission('project', 'delete') && (
        <button>Delete Project</button>
      )}

      {/* Admin-only section */}
      {isAdmin() && (
        <button>View All Projects (Admin)</button>
      )}
    </div>
  );
}
```

---

## Adding a New Permission

1. **Define it in the seed script** (`scripts/seed.ts`):

```ts
{ resource: 'script', action: 'export', scope: 'own', description: 'Export own scripts' },
```

2. **Assign it to roles** in the `rolePermMap`:

```ts
creator: [
  // ... existing
  'script:export:own',
],
```

3. **Re-run the seed** (safe to run multiple times — uses `upsert`):

```bash
npm run seed
```

4. **Use it** in your code:

```ts
// server
const can = await hasPermission(userId, roleId, 'script', 'export', 'own');

// client
const { hasPermission } = usePermissions();
if (hasPermission('script', 'export', 'own')) { ... }
```

> **Important:** Existing logged-in users won't see the new permission in their JWT until they **log out and log back in** (because permissions are embedded at login time).

---

## Adding a New Role

1. **Add to the seed script**:

```ts
const roleDefs = [
  // ... existing roles
  { name: 'moderator', description: 'Can read all content', isDefault: false },
];

// then assign permissions
rolePermMap['moderator'] = [
  'project:read:all',
  'character:read:all',
  'analytics:read:all',
  'user:read:all',
];
```

2. **Re-run the seed:**

```bash
npm run seed
```

3. **Assign the role to a user** by updating their `roleId` in MongoDB directly, or build an admin UI that updates the field.

---

## Per-User Overrides

Insert a `UserPermission` document directly in MongoDB or via an admin API route:

```ts
import UserPermission from '@/models/user-permission.model';
import Permission from '@/models/permission.model';
import { Types } from 'mongoose';

// Grant a specific user permission to read ALL projects (even though their role only has :own)
const perm = await Permission.findOne({ resource: 'project', action: 'read', scope: 'all' });

await UserPermission.create({
  userId:       new Types.ObjectId(targetUserId),
  permissionId: perm._id,
  granted:      true,   // true = grant extra, false = revoke
});
```

The change takes effect on the user's **next login** (when jwt() callback re-reads permissions).

To revoke a role permission for a specific user:

```ts
await UserPermission.create({
  userId:       new Types.ObjectId(targetUserId),
  permissionId: perm._id,
  granted:      false,  // removes this permission even though role has it
});
```

---

## File Map

```
models/
  permission.model.ts         ← Permission schema (resource, action, scope)
  role.model.ts               ← Role schema (name, isDefault)
  role-permission.model.ts    ← RolePermission join table
  user-permission.model.ts    ← UserPermission overrides
  user.model.ts               ← User with roleId reference

lib/
  permissions.ts              ← getUserPermissions(), hasPermission() server utilities

hooks/
  use-permissions.ts          ← Client-side permission checks from JWT

scripts/
  seed.ts                     ← Bootstrap permissions, roles, role-permissions, admin user
```

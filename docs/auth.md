# Authentication

ScriptMinder uses **NextAuth v5** with a **JWT session strategy**. There is no database session table — all user identity data is embedded directly into a signed JWT cookie.

---

## Table of Contents

- [Overview](#overview)
- [Session Data Structure](#session-data-structure)
- [Environment Variables](#environment-variables)
- [Login Providers](#login-providers)
  - [Credentials (Email + Password)](#credentials-email--password)
  - [Google OAuth](#google-oauth)
  - [GitHub OAuth](#github-oauth)
- [How the JWT is Built](#how-the-jwt-is-built)
- [Middleware — Route Protection](#middleware--route-protection)
- [Backend Usage](#backend-usage)
  - [In API Routes](#in-api-routes)
  - [In Server Components](#in-server-components)
- [Frontend Usage](#frontend-usage)
  - [useAuth hook](#useauth-hook)
  - [useLogin hook](#uselogin-hook)
  - [useRegister hook](#useregister-hook)
- [Auth API Endpoints](#auth-api-endpoints)
- [File Map](#file-map)

---

## Overview

```
User submits login form
  → useLogin hook validates with Zod (client-side)
  → signIn('credentials', { email, password }) called
  → NextAuth hits authorize() callback in auth.ts
  → User fetched from MongoDB, password compared with bcrypt
  → On success: user object returned to jwt() callback
  → jwt() callback embeds id, roleId, roleName, permissions[] into the JWT
  → session() callback exposes safe fields to client
  → JWT stored in HTTP-only cookie (managed by NextAuth)
  → useAuth() / auth() read from that cookie on every request
```

---

## Session Data Structure

After login, this is what is available everywhere (client + server):

```ts
session.user = {
  id:          string;       // MongoDB ObjectId as string
  name:        string;       // Display name
  email:       string;
  image:       string | null;
  roleId:      string;       // MongoDB ObjectId of the user's role
  roleName:    string;       // "admin" | "creator" | "viewer"
  permissions: string[];     // e.g. ["project:create:own", "project:read:own", ...]
}
```

Permissions are pre-loaded into the JWT on first login so no extra DB call is needed on every request.

---

## Environment Variables

Add these to your `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://root:root@localhost:27017/script-minder?authSource=admin

# NextAuth — generate with: openssl rand -base64 32
AUTH_SECRET=your_secret_here

# Google OAuth (from console.cloud.google.com)
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret

# GitHub OAuth (from github.com/settings/developers)
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

---

## Login Providers

### Credentials (Email + Password)

Flow:

1. Frontend calls `signIn('credentials', { email, password, redirect: false })`
2. NextAuth hits the `authorize()` callback in `auth.ts`
3. User is fetched from MongoDB with `+password` (normally excluded by `select: false`)
4. `bcryptjs.compare()` is called against the stored hash
5. If valid, a user object is returned — goes into the JWT

Password requirements (enforced at registration):
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

### Google OAuth

1. Frontend calls `signIn('google', { callbackUrl: '/dashboard' })`
2. User is redirected to Google consent screen
3. On return, the `signIn()` callback in `auth.ts` runs:
   - Looks up user by email in MongoDB
   - If not found → creates a new user with the default role (`creator`)
   - If found but `googleId` not set → adds `googleId` to the existing record
4. JWT is built and cookie set

### GitHub OAuth

Same flow as Google — uses `githubId` field on the user document.

---

## How the JWT is Built

Every time a user logs in (any provider), three callbacks run in sequence:

```
signIn() → jwt() → session()
```

### `signIn()` callback
- For OAuth: handles find-or-create user in MongoDB, injects `roleId` and `roleName` into the `user` object
- For credentials: just returns `true` (user object already set by `authorize()`)

### `jwt()` callback
Called once on login. Embeds into the token:

```ts
token.id          = user.id
token.roleId      = user.roleId
token.roleName    = user.roleName
token.permissions = ["project:create:own", "project:read:own", ...]
```

Permissions are resolved by `getUserPermissions()` → reads `RolePermission` collection + applies any `UserPermission` overrides.

### `session()` callback
Copies fields from the JWT token to `session.user` so the client can access them via `useSession()`.

---

## Middleware — Route Protection

File: [`middleware.ts`](../middleware.ts)

Runs on **every request** before any page or API handler. Public paths that bypass the check:

| Path | Reason |
|---|---|
| `/` | Landing page |
| `/login` | Login page |
| `/register` | Register page |
| `/forgot-password` | Password reset page |
| `/api/auth/*` | All NextAuth endpoints |
| `/_next/*` | Next.js internals |
| `*.ext` (files with dots) | Static assets |

Any other path requires an active session. Unauthenticated users are redirected to:

```
/login?redirect=/original-path
```

---

## Backend Usage

### In API Routes

```ts
// app/api/some-protected-route/route.ts
import { auth } from '@/auth';
import { unauthorized, ok } from '@/lib/response';

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized('Login required');

  const { id: userId, roleId, roleName, permissions } = session.user;

  return ok({ message: `Hello ${session.user.name}` });
}
```

### In Server Components

```ts
// app/dashboard/page.tsx (Server Component)
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return <h1>Welcome, {session.user.name}</h1>;
}
```

---

## Frontend Usage

### `useAuth` hook

Located at [`hooks/use-auth.ts`](../hooks/use-auth.ts)

```ts
'use client';
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, isLoading, isAuth, isAnon, logout, updateSession } = useAuth();

  if (isLoading) return <Spinner />;
  if (isAnon) return null; // middleware already redirects, but safe fallback

  return (
    <div>
      <p>Logged in as: {user?.name}</p>
      <p>Role: {user?.roleName}</p>
      <button onClick={() => logout()}>Sign Out</button>
    </div>
  );
}
```

| Property | Type | Description |
|---|---|---|
| `user` | `SessionUser \| null` | Current user or null if not logged in |
| `session` | `Session \| null` | Full NextAuth session object |
| `isLoading` | `boolean` | True while session is being fetched |
| `isAuth` | `boolean` | True when session is confirmed active |
| `isAnon` | `boolean` | True when definitely not logged in |
| `logout(redirectTo?)` | `function` | Signs out and redirects |
| `updateSession()` | `function` | Force-refreshes the session (useful after profile update) |

### `useLogin` hook

Located at [`hooks/use-login.ts`](../hooks/use-login.ts)

```ts
'use client';
import { useLogin } from '@/hooks/use-login';

function LoginForm() {
  const { login, loginWithGoogle, loginWithGitHub, isLoading, error, fieldErrors, clearError } = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ email, password });               // redirects to /dashboard on success
    login({ email, password, redirect: '/projects' }); // or a custom redirect
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <input name="email" />
      {fieldErrors.email && <p>{fieldErrors.email}</p>}
      <input name="password" type="password" />
      {fieldErrors.password && <p>{fieldErrors.password}</p>}
      <button type="submit" disabled={isLoading}>Sign In</button>
      <button type="button" onClick={() => loginWithGoogle()}>Google</button>
      <button type="button" onClick={() => loginWithGitHub()}>GitHub</button>
    </form>
  );
}
```

| Property | Type | Description |
|---|---|---|
| `login({ email, password, redirect? })` | `function` | Credentials login |
| `loginWithGoogle(redirect?)` | `function` | Redirects to Google OAuth |
| `loginWithGitHub(redirect?)` | `function` | Redirects to GitHub OAuth |
| `isLoading` | `boolean` | True while request is in-flight |
| `error` | `string \| null` | Generic error message (e.g. wrong password) |
| `fieldErrors` | `Record<string, string>` | Per-field validation errors |
| `clearError()` | `function` | Resets error state |

### `useRegister` hook

Located at [`hooks/use-register.ts`](../hooks/use-register.ts)

```ts
'use client';
import { useRegister } from '@/hooks/use-register';

function RegisterForm() {
  const { register, isLoading, error, fieldErrors, clearError } = useRegister();

  const handleSubmit = () => {
    register({ name, email, password });  // auto-signs-in then redirects to /dashboard
  };
}
```

| Property | Type | Description |
|---|---|---|
| `register({ name, email, password, redirect? })` | `function` | Creates account then auto-signs-in |
| `isLoading` | `boolean` | True while request is in-flight |
| `error` | `string \| null` | Generic error (e.g. email already exists) |
| `fieldErrors` | `Record<string, string>` | Per-field validation errors |
| `clearError()` | `function` | Resets error state |

---

## Auth API Endpoints

| Method | Path | Auth required | Description |
|---|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | No | NextAuth handler (login, OAuth, signout, session) |
| `POST` | `/api/auth/register` | No | Create a new user account |
| `GET` | `/api/auth/me` | Yes | Returns current user + resolved permissions |
| `GET` | `/api/auth/permissions` | Yes | List all permissions or check a single one |

### `POST /api/auth/register`

Request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secret@123"
}
```

Success response (`201`):
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "roleName": "creator"
  }
}
```

Error response (`422` — validation error):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "password": ["Password must contain at least one uppercase letter"]
  }
}
```

### `GET /api/auth/me`

Returns the authenticated user with their resolved permissions.

```json
{
  "success": true,
  "data": {
    "id": "64a1...",
    "name": "John Doe",
    "email": "john@example.com",
    "roleName": "creator",
    "permissions": [
      "project:create:own",
      "project:read:own",
      "character:create:own"
    ]
  }
}
```

### `GET /api/auth/permissions`

Without query params → returns all your permissions as an array.

With query params → checks a single permission:
```
GET /api/auth/permissions?resource=project&action=create&scope=own
```
```json
{
  "success": true,
  "data": { "has": true }
}
```

---

## File Map

```
auth.ts                                   ← NextAuth config (providers, callbacks)
middleware.ts                             ← Route protection (runs before every request)
types/next-auth.d.ts                      ← TypeScript augmentation for session fields

app/api/auth/
  [...nextauth]/route.ts                  ← NextAuth handler (GET + POST)
  register/
    route.ts                              ← POST — create account
    validation.ts                         ← Zod schema for registration
  login/
    validation.ts                         ← Zod schema (client-side use only)
  me/route.ts                             ← GET — current user + permissions
  permissions/route.ts                    ← GET — list or check permissions

hooks/
  use-auth.ts                             ← Core session hook
  use-login.ts                            ← Login mutations (credentials + OAuth)
  use-register.ts                         ← Registration mutation
  use-permissions.ts                      ← Client-side permission checks

components/auth/
  auth-provider.tsx                       ← SessionProvider wrapper (add to layout)
  auth-forms.tsx                          ← LoginForm + RegisterForm UI components
```

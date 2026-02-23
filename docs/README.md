# ScriptMinder — Developer Documentation

> Internal docs for backend and frontend implementation details.

## Contents

| Document | Description |
|---|---|
| [auth.md](./auth.md) | Authentication system — NextAuth v5, sessions, hooks, middleware |
| [roles-and-permissions.md](./roles-and-permissions.md) | RBAC — roles, permissions, user overrides, usage examples |

## Stack Overview

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | MongoDB via Mongoose 9 |
| Auth | NextAuth v5 (JWT strategy) |
| Validation | Zod v4 |
| Password hashing | bcryptjs |
| OAuth providers | Google, GitHub |

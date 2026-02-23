# ScriptMinder

**AI-powered script writer and optimizer for content creators.** Generate, analyze, and refine video scripts with AI. Import transcripts from TikTok, clone creator styles, and apply character personas for consistent voice.

---

## Overview

ScriptMinder helps content creators write better scripts faster. Create projects, add scripts manually or from TikTok transcripts, attach character personas for style context, then use AI to analyze, optimize, and implement suggestions—all in one workspace.

---

## Features

### Core Script Workflow
- **Create & edit scripts** — Timestamped lines (HH:MM:SS.mmm format), add/remove lines, flag lines with custom colors for organization
- **Multiple input sources** — Manual entry, paste TikTok URL to fetch transcript, or generate via AI chat
- **AI Chat** — Talk to AI with your script as context; get suggestions, rewrites, and new content; apply AI output directly to the script
- **Analyze** — Queue AI analysis (BullMQ + Redis); get actionable vs informational suggestions per line
- **Implement suggestions** — One-click apply AI suggestions to specific lines; preserves flag colors
- **Regenerate** — Give an instruction; AI rewrites the full script in timestamp format
- **Export** — Plain text (.txt), JSON, or Word (.docx)

### Characters
- **Clone from TikTok** — Paste a TikTok URL; AI extracts the creator’s style and creates a reusable character
- **Custom characters** — Create characters with name, description, platform, accent color
- **Use as context** — Attach a character to scripts; AI uses it for regenerate, analyze, and chat

### Projects
- **Organize scripts** — Projects contain multiple scripts; search, filter (Draft/Analyzing/Ready/Published), grid or list view
- **Project metadata** — Title, description, platform, tags, status

### AI & Integrations
- **AI engine** — Google Gemini 2.5 Flash via ADK; modes: generate, analyze, regenerate, chat, clone
- **TikTok transcripts** — Fetch transcripts via Cloudflare Workers proxy; parse VTT; multiple languages supported

### Auth & Access
- **Auth** — NextAuth.js: email/password, Google, GitHub
- **IAM** — Roles, permissions, role-permissions, user-permission overrides
- **Admin** — Users CRUD, IAM management, AI usage logs, TikTok transcript test lab

### Other
- **Read mode** — Read-only script view (modal)
- **Billing UI** — Plans (Starter, Creator, Agency), usage, invoices (UI only; no payment integration)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Auth | NextAuth.js (Credentials, Google, GitHub) |
| Database | MongoDB + Mongoose |
| Queue | BullMQ + Redis |
| AI | Google ADK, Gemini 2.5 Flash |
| TikTok | Cloudflare Workers (proxy + VTT parsing) |
| Styling | Tailwind CSS (dark theme) |

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- MongoDB
- Redis (required for the Analyze feature)

### 2. Environment variables

Create `.env.local` with:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/scriptminder

# Redis (required for Analyze)
REDIS_URL=redis://localhost:6379

# Auth
AUTH_SECRET=your-secret
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# AI
GOOGLE_GENAI_API_KEY=your-gemini-api-key

# TikTok transcript fetching (optional)
CLOUDFLARE_PROXY_URL=
CLOUDFLARE_TIKTOK_URL=
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis locally
```

### 4. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run the Analyze worker (separate terminal)

The Analyze feature uses BullMQ + Redis. Run the worker to process analysis jobs:

```bash
npm run worker:analyze
```

---

## Project Structure

```
app/
├── (dashboard)/          # Protected dashboard routes
│   ├── admin/            # Admin: users, IAM, AI usage, transcript test
│   ├── billing/
│   ├── characters/
│   ├── dashboard/
│   └── projects/[id]/scripts/[sid]/
├── api/                  # API routes
│   ├── auth/
│   ├── ai/
│   ├── characters/
│   ├── iam/
│   ├── projects/
│   ├── tiktok/
│   ├── users/
│   └── admin/
components/
├── auth/
├── dashboard/
├── script/               # Script editor, read mode
├── landing/
└── ui/
lib/
├── ai-agent.ts           # Gemini ADK integration
├── ai-cost.ts            # Token/cost estimation
├── parse-script.ts       # Timestamp parsing
├── tiktok.ts             # TikTok transcript fetching
├── queue.ts              # BullMQ setup
└── workers/              # Background workers
models/                   # Mongoose models
```

---

## Main Workflows

### Script workflow
1. Create a project → Add script (manual / TikTok URL / AI)
2. Attach a character for style context
3. Edit lines (timestamps, text, flag colors)
4. Use **Analyze** → review per-line suggestions (actionable vs informational)
5. Use **Implement** on actionable suggestions
6. Use **Regenerate** for full rewrites
7. Use **Chat** for questions and ad-hoc changes
8. Export (txt / json / docx)

### Character workflow
1. **Clone** — Paste TikTok URL on Characters page → AI extracts style → new character
2. **Custom** — New Character → name, description, platform, accent color
3. Assign character to scripts for AI context

---

## API Overview

| Area | Endpoints |
|------|-----------|
| **Auth** | `POST /api/auth/register`, `[...nextauth]`, `GET /api/auth/me`, `/api/auth/permissions` |
| **Projects** | CRUD, `POST /projects/[id]/scripts`, script CRUD |
| **Scripts** | `POST /scripts/[sid]/analyze`, `/regenerate`, `/implement`, `GET /export?format=txt\|json\|docx` |
| **Characters** | CRUD, `POST /api/characters/clone` |
| **AI** | `POST /api/ai/session`, `POST /api/ai/chat` (streaming) |
| **TikTok** | `POST /api/tiktok/transcript` |
| **IAM** | Roles, permissions, role-permissions, user-permissions |
| **Admin** | Users, AI usage logs, transcript test |

---

## Deploy on Vercel

Deploy using the [Vercel Platform](https://vercel.com/new). Configure environment variables in the Vercel dashboard. Ensure Redis is available (e.g. Upstash) for the Analyze feature.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB](https://www.mongodb.com/docs/)
- [BullMQ](https://docs.bullmq.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [Google AI (Gemini)](https://ai.google.dev/)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Study Material Sharing Platform** - a web application where students can upload, share, discover, and collaborate on educational resources (notes, previous year questions, assignments, books). The platform features AI-powered summaries, study groups with real-time chat, and a gamified leaderboard system.

## Architecture

### Frontend
- **Pure HTML/CSS/JS** (no framework like React/Vue)
- **Tailwind CSS** loaded via CDN with dynamic theming
- **Theme System** (`theme.js`): 8 color themes (yellow default) + dark/light mode toggle, using CSS custom properties
- **GSAP** for landing page animations
- **Material Symbols** for icons
- **PDF.js** (client-side) for text extraction from uploaded PDFs

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
  - Remote project: `https://nqfnnihztqudfmxubtpt.supabase.co`
  - Uses Supabase Auth with Google OAuth
  - Row Level Security (RLS) policies on all tables
- **Edge Functions** (Deno/TypeScript) for AI operations

### AI Integration
- **Multi-Model AI API** (Groq/Gemini via Edge Functions)
- Direct browser calls in `home/ai-service.js` (not via Edge Function)
- Features: summarization, key notes extraction, short question generation, mind map data generation

### File Structure

```
├── index.html              # Landing page (GSAP animations)
├── theme.js                # Global theme manager + Tailwind config
├── login/                  # Auth pages (login/signup)
│   ├── login.html, login.js
│   ├── signup.html, signup.js
│   └── supabase-config.js  # Supabase client initialization
├── home/                   # Main app (requires auth)
│   ├── home.html, home.js           # Dashboard
│   ├── browse.html, browse.js       # Search & filter materials
│   ├── upload.html, upload.js       # Upload materials
│   ├── profile.html, profile.js     # User profile
│   ├── leaderboard.html, leaderboard.js
│   ├── groups.html, groups.js       # Study groups list
│   ├── group-chat.html, group-chat.js   # Group chat
│   ├── study-room.html, study-room.js     # Virtual study room
│   ├── ai-service.js                # AI service client
│   └── recommendations.js           # Material recommendations
├── supabase/
│   ├── config.toml              # Supabase CLI config
│   ├── schema.sql               # Database schema + RLS policies
│   └── functions/gemini-assistant/index.ts  # Edge Function (Deno)
└── package.json                 # Only has @supabase/supabase-js, @google/generative-ai
```

## Database Schema (Supabase)

**Core Tables**:
- `profiles` - extends `auth.users`, stores user metadata, reputation_score
- `materials` - uploaded study materials (title, file_url, branch, semester, subject, category, downloads, avg_rating)
- `reviews` - 5-star ratings + comments on materials
- `study_groups` - collaborative groups (branch/subject based)
- `group_members` - many-to-many membership
- `group_messages` - chat messages within groups
- `downloads` - tracks material downloads
- `bookmarks` - saved materials per user

**Key Enums**:
- `user_role`: student, contributor, admin
- `material_category`: notes, pyqs, assignments, books, presentations, other
- `branch_type`: computer_science, mechanical, electrical, electronics, civil, entc, it, mathematics, physics, chemistry, humanities

## Common Development Commands

### Supabase CLI (Local Development)

The Supabase CLI binary is at `./supabase.exe` (Windows) or use globally installed version.

```bash
# Start local Supabase stack (Postgres, Auth, Storage, Edge Functions)
./supabase.exe start

# Stop local stack
./supabase.exe stop

# View status and URLs
./supabase.exe status

# Apply database migrations
./supabase.exe db push

# Reset local database (applies migrations + seed)
./supabase.exe db reset

# Deploy Edge Functions to production
./supabase.exe functions deploy gemini-assistant

# Serve Edge Function locally (with hot reload)
./supabase.exe functions serve gemini-assistant
```

### Local Dev URLs (when running `supabase start`)
- API: `http://127.0.0.1:54321`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio (UI): `http://127.0.0.1:54323`
- Inbucket (email testing): `http://127.0.0.1:54324`

### File Serving

This is a static site - use any static file server:

```bash
# Python 3
python -m http.server 3000

# Node (if installed globally)
npx serve .

# PHP
php -S localhost:3000
```

Navigate to `http://localhost:3000/index.html` for landing page, or `/login/login.html` for auth.

## Key Configuration

### Supabase Client Config
Located in `login/supabase-config.js`:
- URL: `https://nqfnnihztqudfmxubtpt.supabase.co`
- Anon key is hardcoded (development setup)

### AI API
- **Browser calls**: `home/ai-service.js` uses background Edge Functions for security
- **Edge Function**: Reads from `GROQ_API_KEY` or `GEMINI_API_KEY` environment variables
- API endpoints: Managed securely via Supabase Edge Functions

### Theme System
The `theme.js` file must be loaded before any page-specific scripts. It:
1. Defines Tailwind config with custom colors
2. Sets up theme switching (8 color options)
3. Handles dark mode via `document.body.classList.add('dark')`
4. Injects a floating theme picker on home pages

## Authentication Flow

1. User authenticates via `/login/login.html` (email/password or Google OAuth)
2. On success, redirected to `/home/home.html`
3. Each page checks `window.supabase.auth.getUser()` on load
4. If unauthenticated, redirects back to login

## Working with the Code

### Adding a New Page
1. Create `home/newpage.html` with standard template
2. Include: Tailwind CDN, theme.js, supabase-config.js
3. Wrap content in `<body class="dark">` for dark mode default
4. Add navigation link to sidebar in existing pages

### Database Changes
1. Edit `supabase/schema.sql`
2. Apply with: `./supabase.exe db push` (local) or via Supabase Dashboard SQL Editor (production)
3. RLS policies are defined in schema.sql - ensure they cover new tables

### Edge Functions
- Written in TypeScript/Deno
- Located in `supabase/functions/{function-name}/index.ts`
- Local dev: `./supabase.exe functions serve {function-name}`
- Set secrets: `./supabase.exe secrets set GEMINI_API_KEY=xxx`

### AI Service
The `home/ai-service.js` module exports:
- `extractTextFromPDF(file)` - uses pdf.js, extracts first 5 pages
- `generateSummary(text)` - returns markdown summary (<150 words)
- `generateNotes(text)` - returns bulleted key concepts
- `generateQuestions(text)` - returns short-answer questions with answers in italics
- `generateMindMapData(text)` - returns JSON structure for mind map rendering

## Important Notes

- **No build step** - edit files directly, refresh browser
- **PDF.js** loaded from CDN: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`
- **File uploads** go to Supabase Storage "materials" bucket
- **Realtime** (chat) uses Supabase Realtime subscriptions on `group_messages` table
- **RLS is enforced** - queries will fail silently if policies block access

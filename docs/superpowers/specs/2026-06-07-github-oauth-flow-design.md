# GitHub OAuth Connection Flow — Design Spec
Date: 2026-06-07

## Overview

Build a GitHub OAuth connection flow inside the existing `walkthru-app/` Next.js 16.2.7 project. Users are identified via Replit Auth headers. They connect their GitHub account via OAuth, and can then browse their repos and fetch commit history. A minimal test page wires everything together.

This is Phase 1 foundation work — authentication and data ingestion plumbing before any production UI.

---

## Stack

- **Framework**: Next.js 16.2.7 (App Router), TypeScript
- **Identity**: Replit Auth — reads `X-Replit-User-Id` and `X-Replit-User-Name` request headers
- **Token persistence**: `@replit/database` (survives server restarts)
- **GitHub**: OAuth App (not GitHub App), scope `repo,read:user`

### Environment Variables (Replit Secrets)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `NEXTAUTH_SECRET` (random string — not used by NextAuth, used for any future signing)
- `NEXT_PUBLIC_APP_URL` (e.g. `https://walkthru.replit.app`)

---

## File Structure

All new files live inside `walkthru-app/`:

```
walkthru-app/
  middleware.ts                         # Replit auth enforcement for /api/repos, /api/commits
  lib/
    auth.ts                             # getSessionUser, getGithubToken, storeGithubToken
    github.ts                           # fetchAllCommits, fetchUserRepos
  app/
    api/
      auth/
        github/
          route.ts                      # GET → redirect to GitHub OAuth
        github/callback/
          route.ts                      # GET → exchange code, store token, redirect /test
        status/
          route.ts                      # GET → { replit_authed, github_connected, username }
      commits/
        route.ts                        # GET ?owner=&repo=&limit= → { total, commits }
      repos/
        route.ts                        # GET → { repos }
    test/
      page.tsx                          # Minimal test UI
```

---

## Auth Layer

### middleware.ts

Runs on `/api/repos` and `/api/commits` only. Returns `401 { error: "Not authenticated" }` if `X-Replit-User-Id` header is absent. All `/api/auth/*` routes and `/api/auth/status` are excluded from middleware.

### lib/auth.ts

```ts
getSessionUser(req: Request): { id: string; name: string } | null
  // reads X-Replit-User-Id and X-Replit-User-Name from headers
  // returns null if either is absent

getGithubToken(userId: string): Promise<string | null>
  // reads key `gh_token:{userId}` from Replit DB

storeGithubToken(userId: string, token: string): Promise<void>
  // writes key `gh_token:{userId}` to Replit DB
```

---

## GitHub API Layer

### lib/github.ts

**`fetchAllCommits(owner, repo, token, limit = 500)`**
- Paginates `GET /repos/{owner}/{repo}/commits?per_page=100&page=N`
- Stops when batch is empty OR total fetched ≥ limit
- Max GitHub API calls: `Math.ceil(limit / 100)` = 5 for default limit
- Returns `{ sha, message, author, date }[]`
- On non-200 from GitHub: returns `{ error: string, status: number }` — never throws

**`fetchUserRepos(token)`**
- Calls `GET /user/repos?per_page=20&sort=updated&type=owner` (single page)
- Returns `{ name, full_name, private, updated_at, description }[]`
- On non-200: returns `{ error: string, status: number }`

All calls include:
- `Authorization: Bearer {token}`
- `Accept: application/vnd.github+json`
- `X-GitHub-Api-Version: 2022-11-28`

---

## API Routes

### GET /api/auth/github
- No auth required
- Reads `GITHUB_CLIENT_ID`, `NEXT_PUBLIC_APP_URL`
- Redirects to `https://github.com/login/oauth/authorize?client_id=...&scope=repo,read:user&redirect_uri=...`

### GET /api/auth/github/callback
- No middleware (excluded)
- Reads `code` from query params
- POSTs to `https://github.com/login/oauth/access_token` with `client_id`, `client_secret`, `code`
- Reads `access_token` from response
- Reads user from Replit headers via `getSessionUser(req)`
- Calls `storeGithubToken(userId, token)`
- Redirects to `/test`
- Error cases: missing `code` → 400; missing Replit user → 401; token exchange fails → 500

### GET /api/auth/status
- No auth required
- Returns `{ replit_authed: boolean, github_connected: boolean, username: string | null }`
- Reads Replit headers; if authed, checks Replit DB for token

### GET /api/repos
- Protected by middleware (Replit auth required)
- Reads GitHub token via `getGithubToken(userId)`
- If no token: returns `403 { error: "GitHub not connected", connect_url: "/api/auth/github" }`
- Calls `fetchUserRepos(token)`
- Returns `{ repos }`

### GET /api/commits
- Protected by middleware (Replit auth required)
- Query params: `owner` (required), `repo` (required), `limit` (optional, default 500)
- If no GitHub token: returns `403 { error: "GitHub not connected", connect_url: "/api/auth/github" }`
- If missing owner/repo: returns `400 { error: "owner and repo are required" }`
- Calls `fetchAllCommits(owner, repo, token, limit)`
- Returns `{ total: number, commits: Commit[] }`

---

## Test Page (app/test/page.tsx)

Client component. Calls `/api/auth/status` on mount.

**Auth state display (top of page):**
- No Replit auth → "Sign in via Replit to continue"
- Replit auth, no GitHub → "Signed in as {name}" + "Connect GitHub" button → `/api/auth/github`
- Both connected → "Signed in as {name} · GitHub connected"

**Repo section:**
- "My Repos" button → `GET /api/repos` → renders clickable list
- Clicking a repo populates Owner and Repo text inputs

**Commit section:**
- Owner text input
- Repo text input
- "Fetch Commits" button → `GET /api/commits?owner=&repo=`
- Shows total commit count
- Renders each commit as a row: `[sha7] date | author | message`

**Styling:** Plain Tailwind utility classes, monospace font for commit rows, no custom design system. This is a test harness.

---

## Error Handling

- All routes return `{ error: string }` JSON on failure — never unhandled throws
- GitHub API non-200 responses: forward the status code and error message
- Missing env vars: fail at startup with a clear error message (not silently at runtime)

---

## Rate Limiting

- Each user authenticates with their own OAuth token → isolated 5,000 req/hour quota
- Commits endpoint fetches 100/page (GitHub max), stops at `limit` (default 500 = max 5 calls)
- Repos endpoint fetches 20 repos (single call)
- No shared token, no risk of exhausting a global quota

---

## What This Is Not

- Not the production auth system (that will be GitHub OAuth → Neon Postgres per WALKTHRU.md)
- Not a production UI — test page is scaffolding only
- Not NextAuth — identity is Replit headers only

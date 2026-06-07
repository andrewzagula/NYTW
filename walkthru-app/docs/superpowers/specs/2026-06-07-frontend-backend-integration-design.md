# Frontend ↔ Backend Integration

Wire the built-out frontend (landing, signin, dashboard, repo timeline, chat) to
the real backend APIs (Replit + GitHub OAuth, Postgres-backed repos/sessions,
GitHub commits). Remove the testing pages that demonstrated the backend
end-to-end and replace mock data with live data.

## Goals

1. Real auth in every UI surface — no more localStorage stub.
2. Dashboard shows the user's connected repos from Postgres, with a way to
   connect more from their GitHub account.
3. Repo timeline shows real commits from GitHub rendered through the existing
   two-lane graph.
4. Chat panel calls the existing `/api/chat` route with real owner/name/SHA.
5. Remove `/test`, `/api/debug`, and the mock data modules.

Non-goals: comprehension scores (no backend yet), multi-branch fetching,
perseus retrieval for arbitrary repos, real-time push.

## Architecture

### Auth (`lib/auth/index.tsx`)

Replace the localStorage stub with a fetch-backed provider.

```ts
type AuthUser = {
  id: string;             // replit user id
  name: string;           // replit user name
  githubUsername: string;
  githubAvatar: string;
};
type Ctx = { user: AuthUser | null; loading: boolean; signOut: () => Promise<void> };
```

- On mount: `GET /api/auth/status`. If `replit_authed && github_connected`,
  follow with `GET /api/user/profile` to populate the GitHub fields. If GH not
  connected, `user = null` and the route guard redirects to `/connect-github`.
- `signOut()`: `POST /api/auth/github/disconnect` then `DELETE /api/dev-login`,
  then push to `/`.
- No `signIn`/`connectGithub` methods — those become plain anchor links to
  `/api/auth/github`.

The `(app)` layout's guard logic stays the same: redirect to `/signin` if no
user, `/connect-github` if user has no GitHub. Both checks happen against
`/api/auth/status` shape.

### Sign-in (`app/(auth)/signin/page.tsx`)

Single "Continue with GitHub" anchor → `/api/auth/github`. Strip out:
Google button, email form, mode toggle, all stub state. Page becomes a
mostly static server component.

### Connect-github (`app/(auth)/connect-github/page.tsx`)

Same simplification — button is a plain anchor to `/api/auth/github`.

### OAuth callback (`app/api/auth/github/callback/route.ts`)

Change final redirect from `/test` → `/dashboard`.

### Dashboard (`app/(app)/dashboard/page.tsx`)

Becomes a client component. State:
- `connectedRepos: ConnectedRepo[]` (from `/api/user/profile`)
- `githubRepos: Repo[] | null` (lazy-fetched from `/api/repos` when the user
  opens the "connect a repo" affordance)

Layout:
- Header: title, "your repositories" subtitle, three stat tiles. Only `Repos`
  tile shows a real number. Avg score / Open PRs render as `—`.
- Grid of `RepoCard`s for `connectedRepos`. Each card links to
  `/repos/[owner]/[name]`.
- Below: a "Connect a repo" panel. Toggling it loads `/api/repos` and shows a
  list with per-row connect buttons that `POST /api/repos/select`.
- Empty state (no connected repos): the connect-repo panel is the primary CTA.

### `RepoCard` (`components/dashboard/repo-card.tsx`)

Accept `{ owner, name, connectedAt, lastIndexed }`. Drop the
`teamScore`/`openPrs`/`language` reads. Replace with: owner/name title, score
chip showing `null` (renders as a dash), connected-date footer. The visual
shape stays.

### Repo timeline page

Move route: `app/(app)/repos/[id]/page.tsx` → `app/(app)/repos/[owner]/[name]/page.tsx`.

The page is still a server component. It does, in parallel:
1. `GET /api/commits?owner=&repo=` (forward cookies from `headers()`)
2. `GET <github>/repos/{owner}/{name}` for description/language/default branch —
   wrapped in a new helper `fetchRepoMeta(owner, repo, token)` in
   `lib/github.ts`.

Both helpers run under the user's GitHub token (read via `getSessionUser` +
`getGithubToken` on the server, like other API routes).

The commits → timeline transform lives in `lib/timeline/from-commits.ts`:

```ts
type GitHubCommitWithParents = Commit & { parents: string[] };
function toTimelineNodes(commits: GitHubCommitWithParents[]): TimelineNode[];
```

Algorithm:
1. Build a `sha → commit` map.
2. Walk first-parent chain from `commits[0]` (the newest) — those go on lane 0.
3. Any commit not on the chain → lane 1.
4. A commit with ≥ 2 parents → `type: "merge"`, otherwise `"commit"`.
5. `branch` field: `"main"` for lane 0, `"feature"` for lane 1 (we don't know
   the actual branch name without /branches).
6. `score: null` for every commit (no gate yet).

If commits have only one parent each (linear history), output is all-lane-0
and the SVG renders a single rail — the existing graph handles that.

**GitHub commits endpoint** today returns parents implicitly but the helper
`fetchAllCommits` doesn't surface them. Update `lib/github.ts` to include
`parents: string[]` on each `Commit`.

### Branch switcher

Hide for now (`hidden`/conditionally not rendered). The default branch is
known from the GitHub repo metadata; multi-branch fetching is a future task.

### Chat panel + API

`ChatPanel` props change: replace `repoId` with `owner`, `name`. Pass
`commitSha` unchanged. The request body sent to `/api/chat` becomes
`{ owner, name, commitSha? }`.

`/api/chat/route.ts`:
- Parse `{ messages, owner, name, commitSha? }`.
- Auth via `getSessionUser` + `getGithubToken` — same pattern as other API
  routes.
- Real mode iff `ANTHROPIC_API_KEY` is set. No more `perseusIndexId` gate.
- Real mode pulls repo metadata via `fetchRepoMeta` for the system prompt, and
  the commit's metadata + truncated diff via `fetchCommitDiff` when `commitSha`
  is set. No Perseus call.
- Mock mode (no key) returns `scriptedMockAnswer` using a minimal `RepoLike`
  object built from owner/name.

`lib/chat/context.ts`:
- `chatHeader`, `suggestedPrompts`: accept `{ owner, name, language? }`-style
  object instead of `MockRepo`.
- `buildSystemPrompt`: accepts the lighter `RepoLike` shape. Optional
  `commitDiff` field added — if provided, include in the prompt under a
  "Diff context" section instead of `PerseusHit[]`.

### Removals

- `app/test/` (page + components)
- `app/api/debug/`
- `lib/mock/` (entire directory: `repos.ts`, `timeline.ts`, `timeline.test.ts`)
- `lib/perseus.ts`, `lib/perseus.test.ts` — drop unused retrieval indirection
  (it never had real callers; the chat route stops importing it).
- The `repos.select` route is _kept_; it's how the dashboard hands a repo to
  the backend.

### Kept (with no UI surface)

- `app/dev-login/page.tsx` — direct URL only.
- `app/api/dev-login/route.ts`
- README mentions of dev login.

### Style and layout

Existing visual language stays (vermillion accents, mono labels, score chip,
corner brackets). The dashboard cards may render some fields as `—` until
backend grows them; that's acceptable — the layout doesn't change.

## Data shapes touched

```ts
// lib/github.ts — Commit gains parents
type Commit = { sha; message; author; date; parents: string[] };

// lib/timeline/from-commits.ts — new module
function toTimelineNodes(commits: Commit[]): TimelineNode[];

// /api/chat request body
{ messages: UIMessage[]; owner: string; name: string; commitSha?: string }
```

## Testing

- `lib/timeline/from-commits.test.ts`: unit tests for the lane-reconstruction
  algorithm (linear, single branch + merge, multiple parents).
- Existing `lib/chat/context.test.ts` updated to match the new `buildSystemPrompt`
  signature.

## Risks

- The repo-meta + commits fetch is sequential-ish per page load; large repos
  (`/api/commits` defaults to 500) can be slow on first hit. Acceptable for v1;
  caching is a follow-up.
- Switching `[id]` → `[owner]/[name]` may break old bookmarks. There are no
  external users yet, so we accept the breakage.
- Removing `lib/perseus.ts` may surface unused imports — caught by `eslint`.

## Out of scope

- Comprehension score wiring (CLI/webhook hasn't shipped).
- Multi-branch graph (would need a `/branches` endpoint + per-branch commit
  fetch).
- Avatar fallback to GitHub avatar in the (app) layout — keep current
  initials-only fallback.
- Caching the GitHub responses.

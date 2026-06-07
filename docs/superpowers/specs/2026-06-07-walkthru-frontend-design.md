# Walkthru Front-End Design — Landing, Docs, Auth, Dashboard

**Date:** 2026-06-07
**Status:** Approved (pending spec review)
**Scope:** The first pass of the Walkthru web app UI — six screens, mocked data, stubbed auth.

---

## 1. Goal

Build the public-facing and signed-in shell of the Walkthru web app: a landing page, CLI docs, an auth flow, and a dashboard that lists repos and opens into a git timeline. The work establishes the design system (dark, terminal-influenced) and the page structure that later phases (real GitHub/AI wiring) hang off of.

This phase delivers **navigable, polished UI running on mocked data**. No real GitHub, database, or AI calls. Auth is stubbed behind a clean boundary so the real provider drops in later without touching the screens.

## 2. Scope

Six screens:

1. **Landing** — marketing page with header (logo, Docs, Sign in) and a hero that shows the CLI comprehension gate.
2. **Docs** — docs-style page about the CLI tool, sidebar + scrollable content.
3. **Sign in / Sign up** — GitHub, Google, or email.
4. **Connect GitHub** — extra step for Google/email users; GitHub sign-ins skip it.
5. **Dashboard** — list of the user's repos as cards.
6. **Repo timeline** — readable git timeline for a selected repo.

### Non-goals (this phase)

- Real OAuth / Replit / GitHub / Google auth.
- Real GitHub data ingestion, Postgres, or webhooks.
- AI Q&A, summaries, or grading.
- Commit/PR detail panels (the timeline renders; clicking into a single commit comes later).
- The CLI itself (separate package, separate phase).
- Comprehension dashboard analytics (trends, per-repo breakdowns) beyond a summary score chip.

## 3. Tech & conventions

- **Next.js 16.2.7** (App Router), **React 19**, **TypeScript**.
- **Tailwind CSS v4** (already configured via `@import "tailwindcss"` + `@theme`).
- **shadcn/ui** for accessible primitives (button, dialog, dropdown-menu, tabs, input, card), **themed hard** to the tokens below so they don't read as default-shadcn. shadcn copies component source into the repo, so we own and restyle it.
- **Martina Plantijn** (serif display, loaded from `public/martina-plantijn-font-family/` via `next/font/local`) + **Inter** (UI/body, via `next/font/google`) + **system monospace** (code/SHAs/CLI/labels — no extra download). `layout.tsx` currently wires Geist and must be rewired to these.
- **Mocked data** in `lib/mock/`, **stubbed auth** in `lib/auth/`.

> ⚠️ `walkthru-app/AGENTS.md` flags this Next.js as having breaking changes from older versions. Before scaffolding shadcn or writing route code, verify against `node_modules/next/dist/docs/` and confirm shadcn's init works with the installed Next 16 + Tailwind v4 — do not assume older App Router conventions.

## 4. Design system

Dark, terminal-influenced, with a bold vermillion accent — drawn from RIG / HydraDB / DOSS / Retool as reference. The landing leads with a full-bleed red hero that hard-cuts to black; every other screen is black with red accents. Heavy grotesque headlines, mono uppercase micro-labels, and technical data motifs (corner brackets, ticker bar, dotted git-graph) carry the identity.

### Color tokens (defined in `globals.css` `@theme`)

| Token | Value | Use |
|---|---|---|
| `--background` | `#09090b` (zinc-950) | App base |
| Panel | `#18181b` (zinc-900) | Cards, sidebars, terminal frame |
| Elevated | `#27272a` (zinc-800) | Hover/active surfaces, inputs |
| Border | `#27272a` / `#3f3f46` | Hairline borders, dividers |
| Text primary | `#fafafa` (zinc-50) | Headlines, body |
| Text secondary | `#a1a1aa` (zinc-400) | Sub-copy, metadata |
| Text muted | `#71717a` (zinc-500) | Timestamps, hints |
| **Brand accent** | `#FF4D2E` (vermillion) | Primary buttons, links, focus rings, mono eyebrows, hero fill |
| Brand deep | `#E8472B` | Accent hover/pressed, hero gradient/texture |
| Hero ink | `#0b0b0c` near-black | Headline + nav text **on the red hero** |
| Score low | `#f43f5e` (rose-500) | Comprehension score < ~50 |
| Score mid | `#fbbf24` (amber-400) | ~50–75 |
| Score high | `#34d399` (emerald-400) | > ~75 |

The brand accent is an orange-leaning vermillion; the low-score color is a pink-leaning rose. They sit in different hue zones so a "bad score" never reads as a brand element. If the two still feel too close in context, the fallback is to render low scores as a **muted/dim** chip rather than rose — which also better fits the "scores are coaching, not punishment" principle.

### Type

Three roles, two loaded webfonts:

- **Display — Martina Plantijn** (serif), loaded local from `public/` via `next/font/local`, mapped to a `--font-display` variable. Used for hero + section headlines at **Black/Bold** weight, large sizes (hero `text-6xl`+, sections `text-4xl`), `tracking-tight`. An editorial serif headline against the technical red/dark gives Walkthru a premium edge — a deliberate move away from the RIG grotesque.
- **UI/body — Inter**, via `next/font/google`, mapped to `--font-sans`. All nav, body copy, buttons, form fields, card text, metadata.
- **Mono — system stack** (`ui-monospace, "SF Mono", Menlo, monospace`), mapped to `--font-mono`. Used for: the `◢ walkthru` wordmark, SHAs, CLI commands, config keys, timeline branch/commit labels, score numerals, and the **uppercase micro-labels in vermillion** (eyebrows like "THE PROBLEM", card kickers, ticker items, stat labels) — a signature element. No font download.
- The `martina-plantijn-font-family/` files are **trial weights** (`Test…`, see `Befonts-License.txt`) — fine for development; a production license is required before shipping.

### Other tokens

- Radius: `rounded-lg` (0.5rem) default; `rounded-full` for pills/CTAs.
- Borders: 1px hairline `zinc-800`; focus ring `vermillion` at ~40% with 2px offset on `zinc-950`.
- Motion: 150ms ease transitions; fades and small translates only. No bounce.
- Texture: the red hero carries a subtle darker-red grid/noise overlay; the black sections carry a faint `zinc-900` dotted grid behind data motifs.
- **Corner brackets:** a recurring `⌐ ¬` / `L ⌐` framing on stat chips, score chips, and feature cards (HydraDB-style) — thin vermillion strokes at the corners rather than a full border.

### Shared components

- `<ScoreChip score={number} />` — corner-bracketed chip showing a 0–100 score, colored by the low/mid/high scale, mono numerals.
- `<CopyButton text={string} />` — copies CLI snippets/SHAs, shows a transient check.
- `<Terminal>` — a faux terminal frame (window chrome dots, mono body) used in the hero/problem section and docs.
- `<Logo />` — `◢ walkthru` mono wordmark (black on the red hero, white on dark).
- `<Ticker>` — full-width marquee bar of mono uppercase value-props separated by `·` (RIG-style), sits at the red→black seam.
- `<CornerBracket>` — wrapper that draws thin vermillion corner strokes around stats/cards.
- `<GitGraphMotif>` — decorative dotted/pixel git-graph used as the hero/problem-section data motif (echoes HydraDB's pixel tree).

## 5. Auth boundary (the stub)

All auth goes through one module so the real provider swaps in without touching screens.

`lib/auth/index.ts` exposes:

```ts
type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  githubConnected: boolean;
};

getCurrentUser(): AuthUser | null   // reads stub session
signIn(provider: "github" | "google" | "email", email?: string): AuthUser
connectGithub(): void               // flips githubConnected = true
signOut(): void
```

**Stub implementation (this phase):** session persisted in a cookie (so server components can read it) plus a small `AuthProvider` client context for reactive UI. `signIn("github")` returns a user with `githubConnected: true`; `signIn("google" | "email")` returns `githubConnected: false`, which routes the user to **Connect GitHub** before the dashboard.

**Protected routes:** the `(app)` route group checks `getCurrentUser()`; if null, redirect to `/signin`. If `githubConnected` is false, redirect to `/connect-github`.

When real auth lands, only `lib/auth/` changes — screens keep calling the same functions.

## 6. Mock data

`lib/mock/repos.ts` — ~6 repos:

```ts
type MockRepo = {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  branchCount: number;
  lastActivity: string;   // ISO; render as relative
  teamScore: number;      // 0–100
  openPrs: number;
};
```

`lib/mock/timeline.ts` — per repo, a small graph that exercises the renderer: a `main` lane plus one feature branch that diverges and merges back, ~10–14 nodes total.

```ts
type TimelineNode = {
  sha: string;            // short, mono
  message: string;
  author: { name: string; avatarUrl: string };
  date: string;          // ISO
  branch: string;        // lane name
  parents: string[];     // for divergence/merge rendering
  score: number | null;  // null = committed without the CLI gate
  type: "commit" | "merge";
};
```

## 7. Routing & file structure

```
walkthru-app/
  app/
    layout.tsx                  # root: fonts, AuthProvider, base theme
    page.tsx                    # 1. Landing
    docs/
      page.tsx                  # 2. Docs (single scrollable page + anchor sidebar)
    (auth)/
      signin/page.tsx           # 3. Sign in / Sign up
      connect-github/page.tsx   # 4. Connect GitHub
    (app)/
      layout.tsx                # app shell + auth guard
      dashboard/page.tsx        # 5. Dashboard
      repos/[id]/page.tsx       # 6. Repo timeline
  components/
    ui/                         # themed shadcn primitives
    shared/                     # ScoreChip, CopyButton, Terminal, Logo
    landing/                    # Header, Hero, FeatureGrid, Footer
    docs/                       # DocsSidebar, DocSection
    timeline/                   # TimelineGraph, CommitRow, BranchLane
  lib/
    auth/                       # stub auth + AuthProvider
    mock/                       # repos.ts, timeline.ts
    utils.ts                    # cn(), relative-time, score→color
```

Docs is a **single scrollable page** with a sticky sidebar that scroll-spies section anchors (Overview, Install, `login`, `init`, Config, Question types, Grading) — simpler and faster than per-section dynamic routes for this content volume.

## 8. Screen specs

### 8.1 Landing (`/`)

RIG-style structure: a full-bleed **red hero** that hard-cuts into a **black body**.

- **Header** (on the red hero at top): `<Logo />` in black left; `Docs` link + black `Sign in` button right (black-on-red, like RIG's "Get Early Access"). Sticky — once scrolled past the hero it becomes a solid black bar with white logo + hairline bottom border. Mobile: collapse links into a menu.
- **Red hero** (full-bleed vermillion, subtle darker-red grid/noise): heavy black headline (~"Ship code your team actually understands."), one-line black subhead, two CTAs — `Get started` (black button, → `/signin`) and a mono `npm i -g @walkthru/cli` pill with `<CopyButton>` (black/outline on red).
- **Ticker seam**: `<Ticker>` marquee bar at the red→black transition — `COMPREHENSION GATE · VISUAL TIMELINE · AI Q&A · GROUNDED IN YOUR DIFFS ·`.
- **The Problem** (black): mono red eyebrow "THE PROBLEM", heavy white headline, a 2×2 grid of points (commit noise, evaporating PR context, onboarding, "why does this work?") with mono red kickers; a `<GitGraphMotif>` dotted graph alongside.
- **Terminal demo** (black): `<Terminal>` showing the gate flow from the spec — staged line count, a generated question, a typed answer, then `Score: 82/100` with feedback. Static, styled, the centerpiece proof.
- **Feature grid** (black, corner-bracketed cards): 3–4 — Visual timeline, AI Q&A grounded in real diffs, The comprehension gate, Scores as coaching. Each: mono red label, title, one sentence, small motif.
- **Footer**: wordmark, minimal links (Docs, GitHub, repo), copyright.
- Responsive: single column under `md`; CTAs stack; terminal/graph scroll horizontally if needed.

### 8.2 Docs (`/docs`)

- Two-column: sticky **sidebar** (section list, active section highlighted via scroll-spy) + **content** column (max-width prose).
- Sections, sourced from walkthru.md: Overview, Install, `walkthru login`, `walkthru init`, Configuration (`.walkthru.json` with annotated keys), Question types (explain/impact/risk), Grading rubric (accuracy/depth/awareness).
- Code blocks: `<Terminal>`/mono blocks with `<CopyButton>`.
- Top of content reuses the landing header (logo + Sign in) for a consistent shell.
- Responsive: sidebar collapses to a top dropdown / drawer under `lg`.

### 8.3 Sign in / Sign up (`(auth)/signin`)

- Centered card on dark, narrow. Logo above.
- Buttons: `Continue with GitHub` (vermillion primary), `Continue with Google` (outline), divider "or", email `Input` + `Continue` button.
- Microcopy under GitHub: "Connects your repos in one step." Under email/Google: notes a GitHub connect step follows.
- A sign-in/sign-up **toggle** (link) — same form, copy changes ("Welcome back" vs "Create your account").
- Submitting calls `signIn(provider)`, then routes: GitHub → `/dashboard`; Google/email → `/connect-github`.
- No real validation beyond non-empty email; this is a stub.

### 8.4 Connect GitHub (`(auth)/connect-github`)

- Shown only when `githubConnected === false`. Single focused card.
- Copy: "Connect GitHub to pull your repos." Short list of what Walkthru reads (repos, branches, PRs, commits — from the spec).
- `Connect GitHub` button → `connectGithub()` → `/dashboard`. Secondary "Do this later" → dashboard with an empty state (optional; default is required).
- If a GitHub-authed user lands here, redirect straight to dashboard.

### 8.5 Dashboard (`(app)/dashboard`)

- **App shell** (`(app)/layout.tsx`): top nav with `<Logo />`, repo breadcrumb slot, and an avatar dropdown (name, email, Sign out via `signOut()`). Auth guard runs here.
- Heading "Your repositories" + count; optional search/filter input (client-side filter over mock list).
- **Repo cards** grid: repo name (mono, `owner/name`), default branch, branch count, open PRs, last activity (relative), `<ScoreChip>` for team comprehension score. Hover lifts to elevated surface; whole card links to `/repos/[id]`.
- Empty state (if a user skipped GitHub connect): illustration-light panel with `Connect GitHub` CTA.
- Responsive: 1 col mobile, 2 `md`, 3 `xl`.

### 8.6 Repo timeline (`(app)/repos/[id]`)

- Header: `owner/name` (mono), branch switcher (`<DropdownMenu>` over branch names), back-to-dashboard.
- **Timeline**: vertical, newest at top. Each `<CommitRow>`: graph node + lane line on the left, then SHA (mono), message, author avatar + name, relative time, and `<ScoreChip>` (or a muted "no gate" marker when `score === null`).
- **Branch/merge rendering**: a second lane offsets for the feature branch; divergence and merge points draw connecting strokes between lanes (SVG or bordered pseudo-elements). Keep it readable, not ASCII — two lanes max for this pass.
- Rows are visually clickable (hover state) but the commit detail panel is **out of scope** this phase — clicking is a no-op or routes to a stub.
- Responsive: under `md`, collapse to a single lane with branch labels inline.

## 9. Success criteria

- All six routes render with the dark terminal aesthetic and shared design tokens.
- Header nav moves between Landing ↔ Docs ↔ Sign in.
- Sign-in stub: GitHub → dashboard directly; Google/email → Connect GitHub → dashboard.
- Dashboard lists mock repos; clicking one opens its timeline.
- Timeline renders a two-lane graph (one branch + merge) with per-commit score chips from mock data.
- Auth guard redirects unauthenticated users away from `(app)` routes.
- Swapping real auth later requires changes only inside `lib/auth/`.
- Reasonable responsive behavior at mobile / tablet / desktop widths.

## 10. Open questions / deferred

- Brand wordmark mark (`◢`) — placeholder; can refine later.
- Monospace for code/labels — defaults to the system mono stack (no third webfont). Drop entirely (code in Inter) only if the user prefers zero mono.
- Martina Plantijn is a **trial license** — production use needs a proper license.
- Score "low" color — rose by default; fall back to a muted/dim chip if rose reads too close to the vermillion brand.
- Exact landing headline/subhead copy — draft in build, easy to tweak.
- Whether Connect GitHub is skippable — default to required; revisit if onboarding needs a softer path.
- Commit detail panel, PR view, branch comparison, comprehension analytics — future phases.

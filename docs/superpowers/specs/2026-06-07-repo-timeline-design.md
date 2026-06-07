# Repo Timeline — Design Spec
Date: 2026-06-07

## Overview

Add a vertical timeline visualization to the right side of `/test`. Each row represents one calendar day that had commits in the currently-fetched range. Each row shows a horizontal candle bar (additions/deletions split around a center axis) plus author-colored dots — one per commit. Clicking a row scrolls the existing commit list to the first commit from that day.

This is a visualization layer over data we already fetch, plus one new endpoint for per-commit stats.

---

## Layout

The `/test` page becomes a two-column flex layout once commits are loaded:

```
+----------------------------------+----------------------+
| Left: existing commit list       | Right: timeline      |
|   - clickable rows               |   - sticky strip     |
|   - expand-to-diff               |   - scrolls indep.   |
|   - max-height with scroll       |   - ~220px wide      |
+----------------------------------+----------------------+
```

- The timeline is hidden until commits are fetched (no empty placeholder).
- On viewports < 720px, the timeline collapses below the commit list (stacked) instead of beside it.
- The commit list keeps its existing styling and behaviors.

---

## Row Anatomy

Each row corresponds to one calendar day with ≥ 1 commit. Newest day at top.

```
+--------+---------------------------+-------------+
| Mar 5  | ███░░░░░░│░░░░░██████      | • • • • •   |
| Mar 4  |     ████ │ ███             | • •         |
| Mar 1  |          │█                | •           |
+--------+---------------------------+-------------+
   date     candle bar (centered)       author dots
```

**Date label** (~50px): `MMM d` format (e.g. "Mar 5"). `MMM d, yyyy` if the year differs from current.

**Candle bar** (~110px wide, ~10px tall):
- A vertical center axis divides additions (right, green) from deletions (left, red).
- Each side's width is proportional to that day's additions/deletions, scaled against the global max across all visible days (the day with the most total churn fills the available 55px on its larger side).
- Bars use solid color: `green-500` for additions, `red-500` for deletions on dark bg.
- Subtle background track behind the bar so empty days (e.g. all-deletions or all-additions) still show shape.

**Author dots** (~50px on the right):
- One dot per commit that day, ordered chronologically left-to-right.
- Dot size: 6px. Color: stable per-author from a 10-color palette (hash author name → palette index).
- More than 8 commits → show first 7 dots then a "+N" badge in muted gray.

**Hover** (anywhere on the row): tooltip showing `{commits} commits · +{additions} / -{deletions} · authors: a, b, c`.

**Click** (anywhere on the row): smooth-scroll the commit list so the first commit of that day is at the top of the visible commit-list area. Brief 1s yellow highlight on that commit row to confirm.

---

## Data Layer

### New endpoint: `GET /api/commits-summary`

Same auth as `/api/commits` (Replit + GitHub token via middleware).

**Query params:** `owner` (required), `repo` (required), `limit` (default 500).

**Behavior:**
1. Calls `fetchAllCommits(owner, repo, token, limit)` to get the SHA list.
2. For each SHA, calls `https://api.github.com/repos/{owner}/{repo}/commits/{sha}` to get `stats.additions` and `stats.deletions`.
3. These per-SHA calls run in parallel with **a concurrency cap of 8** (custom promise pool, no external library).
4. On any non-200 from GitHub, that commit is included with `additions: 0, deletions: 0` (we don't fail the whole request for one bad commit).

**Response:**
```ts
{
  total: number;
  summary: Array<{
    sha: string;
    date: string;       // ISO timestamp
    author: string;
    additions: number;
    deletions: number;
  }>;
}
```

**Why server-side:** Avoids 500 parallel `fetch` calls from the browser, lets us cap concurrency cleanly, single client request → single render cycle.

### New helper: `lib/github.ts` → `fetchCommitsSummary(owner, repo, token, limit)`

Wraps the SHA-list + per-commit-stats logic. Returns the same shape as the route's `summary` field, or a `GitHubError`. Concurrency cap lives here, not in the route file.

---

## Client State (in `app/test/page.tsx`)

New state on top of existing:

```ts
const [summary, setSummary] = useState<CommitSummaryEntry[] | null>(null);
const [summaryLoading, setSummaryLoading] = useState(false);
```

After a successful `/api/commits` response, kick off a parallel `/api/commits-summary` fetch with the same owner/repo/limit. The commit list renders immediately from `/api/commits`; the timeline shows a loading state until summary arrives.

If summary fails: timeline shows an inline error message in its column, commit list is unaffected.

---

## Bucketing Logic

Pure client-side, runs over the `summary` array:

```ts
function bucketByDay(entries: CommitSummaryEntry[]): DayBucket[]
```

Groups by `date.slice(0, 10)` (UTC date prefix). Returns array sorted newest-first. Each bucket:

```ts
{
  day: string;             // "2026-03-05"
  additions: number;       // sum
  deletions: number;       // sum
  commits: Array<{ sha: string; author: string; date: string }>;
}
```

---

## Author Color Palette

Stable, hash-based:

```ts
const PALETTE = [
  "bg-amber-400", "bg-sky-400", "bg-emerald-400", "bg-rose-400",
  "bg-violet-400", "bg-cyan-400", "bg-lime-400", "bg-fuchsia-400",
  "bg-orange-400", "bg-teal-400",
];

function authorColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
```

Same author always gets the same color across renders. Collisions are acceptable (10 colors, may overlap with many authors).

---

## Scroll-to-Commit

The commit list gets `id="commit-list"` and each `<li>` gets `id={`c-${sha}`}`.

Click handler:
```ts
function scrollToCommit(sha: string) {
  const el = document.getElementById(`c-${sha}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-yellow-400");
    setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400"), 1000);
  }
}
```

Called with the first commit's SHA in the clicked bucket.

---

## Component Decomposition

Pulling timeline UI out of `page.tsx` to keep it focused:

```
app/test/
  page.tsx                # auth + repo/commit fetch + 2-column layout
  components/
    Timeline.tsx          # right column: takes summary, renders rows
    TimelineRow.tsx       # single day row: bar + dots + hover/click
    AuthorDots.tsx        # the dot strip — isolated for testability
```

`page.tsx` passes `summary` and a `scrollToCommit` callback into `Timeline`. Timeline owns its own bucketing.

---

## Error Handling

- `/api/commits-summary` non-200 → timeline column shows `Failed to load timeline: {error}`. Commit list unaffected.
- Empty `summary` → timeline shows `No commits in range.`
- Single commit per day with 0/0 stats → row still renders; bar invisible, dot still shows.

---

## Out of Scope (Explicitly)

- No wicks (would only have meaning in vertical orientation; horizontal candles drop them).
- No multi-day bucketing (week/month) — locked to per-day for now.
- No filtering UI on the commit list — clicking scrolls, doesn't filter.
- No persistence — timeline is rebuilt on every commit fetch.
- No comprehension scores (Phase 4 of WALKTHRU.md, separate work).

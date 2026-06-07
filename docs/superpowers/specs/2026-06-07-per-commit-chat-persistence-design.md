# Per-Commit Persisted Chat — Design

**Date:** 2026-06-07
**Status:** Approved

## Summary

Replace the "no gate" indicator on the commit timeline with a chat button on
each commit row, and persist each commit's chat with the LLM so it can be
reopened later. Chats are stored in Postgres, scoped privately to each user, and
each row shows a subtle indicator when a saved chat already exists for that
commit.

## Background / Current State

- The repo timeline page (`app/(app)/repos/[owner]/[name]/page.tsx`) renders
  `TimelineGraph` on the left and `ChatPanel` on the right.
- Each commit row in `components/timeline/timeline-graph.tsx` renders a
  `ScoreChip` (`components/shared/score-chip.tsx`) on the far right. `ScoreChip`
  shows "no gate" when `score === null`.
- The timeline is built by `lib/timeline/from-commits.ts`, which **hardcodes
  `score: null`** for every commit. Real comprehension scores live in the
  separate CLI quiz flow (`sessions` / `attempts` tables) and were never wired
  into the timeline — so in practice every row currently reads "no gate".
- Clicking a commit row navigates to `?commit=<sha>`, which sets the active
  commit and updates the `ChatPanel` context.
- `ChatPanel` (`components/chat/chat-panel.tsx`) uses `@ai-sdk/react`'s
  `useChat` with `DefaultChatTransport` → `POST /api/chat`. It is re-keyed per
  commit (`key={commitNode?.sha ?? "general"}`), so switching commits resets the
  thread. **Chats are currently ephemeral — nothing is persisted.**
- `/api/chat` (`app/api/chat/route.ts`) receives `{ messages, owner, name,
  commitSha }`, enriches with GitHub repo/commit diff context, and streams from
  Claude (`claude-opus-4-8`) via `streamText(...).toUIMessageStreamResponse(...)`.
  When `ANTHROPIC_API_KEY` is absent it returns a scripted mock via
  `mockUIMessageResponse`.
- Persistence layer is real Postgres: `lib/postgres.ts` (pool + `initDb` table
  creation) and `lib/db.ts` (typed query functions). Tables: `users`,
  `github_tokens`, `connected_repos`, `sessions`, `attempts`, `quiz_questions`.

## Goals

1. Remove the "no gate" `ScoreChip` from the commit timeline rows.
2. Add a chat button to each commit row that opens that commit's chat.
3. Persist each commit's chat (private per user) so it survives reloads and is
   available on future visits.
4. Show a subtle indicator on rows that already have a saved chat.

## Non-Goals (YAGNI)

- Persisting the general (no-commit-selected) repo chat — stays ephemeral.
- Sharing chat threads across users / teams — chats are private per user.
- Removing `ScoreChip` anywhere other than the timeline (it remains on the
  landing page).
- Wiring real comprehension scores into the timeline.

## Approach

**Server-authoritative persistence.** Save the conversation inside the existing
`/api/chat` route when the stream finishes, and load it server-side on the repo
page. This reuses the route that already knows the commit context, keeps one
source of truth, and avoids a second endpoint or extra client round-trips.

(Rejected alternative: a separate client-driven `GET/POST
/api/commits/[sha]/chat` endpoint with load-on-mount / save-on-finish in the
client — more moving parts and two write paths for no benefit here.)

## Detailed Design

### 1. Database

**New table `chat_messages`** (created in `lib/postgres.ts` `initDb`):

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT NOT NULL,            -- AI SDK UIMessage.id
  user_id    TEXT NOT NULL,
  repo       TEXT NOT NULL,            -- "owner/name"
  commit_sha TEXT NOT NULL,
  seq        INTEGER NOT NULL,         -- order within the thread
  role       TEXT NOT NULL,            -- "user" | "assistant" | ...
  parts      JSONB NOT NULL,           -- UIMessage.parts, round-trips cleanly
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, repo, commit_sha, seq)
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_idx
  ON chat_messages (user_id, repo, commit_sha);
```

Storing the `UIMessage` shape (`id`, `role`, `parts`) means messages round-trip
back into `useChat` without lossy conversion.

**New functions in `lib/db.ts`:**

- `getChatMessages(userId, repo, commitSha): Promise<ChatStoredMessage[]>` —
  ordered by `seq`, returns the `UIMessage`-compatible rows.
- `saveChatMessages(userId, repo, commitSha, messages): Promise<void>` —
  replace-all within a transaction (DELETE the thread, then INSERT all messages
  with `seq = index`). `onFinish` hands us the full conversation, so replace-all
  is simplest and idempotent.
- `getCommitsWithChats(userId, repo): Promise<Set<string>>` — `SELECT DISTINCT
  commit_sha` for the row indicators.

A small pure helper converts `UIMessage[]` ⇄ row tuples
(`{ id, role, parts, seq }`) so it can be unit-tested without a DB.

### 2. `/api/chat` route

- Pass `originalMessages: messages` and an `onFinish` callback to
  `toUIMessageStreamResponse`. In `onFinish({ messages: finalMessages })`, call
  `saveChatMessages(userId, "owner/name", commitSha, finalMessages)`.
- **Guards:** only persist when there is a logged-in `sessionUser` **and** a
  `commitSha`. (General repo chat is not persisted.)
- **Mock path:** also persist in the mock branch so the feature works without an
  `ANTHROPIC_API_KEY`. The mock answer text is known, so construct the assistant
  `UIMessage` and save `[...incomingMessages, assistantMessage]` before/after
  returning the mock stream.
- **Resilience:** wrap every save in try/catch and log on failure — a DB error
  must never break or interrupt the chat stream.

### 3. Repo page (server component)

In `app/(app)/repos/[owner]/[name]/page.tsx`:

- When a commit is active, call `getChatMessages(userId, "owner/name", sha)` and
  pass the result as `initialMessages` to `ChatPanel`.
- Call `getCommitsWithChats(userId, "owner/name")` and pass the resulting set
  (as an array of SHAs) to `TimelineGraph`.

### 4. `TimelineGraph` / commit row

In `components/timeline/timeline-graph.tsx`:

- Remove the `ScoreChip` usage and its import.
- Add a `chatShas?: string[]` (or `Set<string>`) prop.
- Replace the score column with a chat button: a `MessageSquare` icon button
  styled consistently with the existing design, that opens `?commit=<sha>` (same
  navigation the row already uses). Show a small dot/marker when the row's sha is
  in `chatShas`.
- Keep the row click behavior intact (clicking anywhere on the row still opens
  the commit + chat).

### 5. `ChatPanel`

In `components/chat/chat-panel.tsx`:

- Accept an `initialMessages?: UIMessage[]` prop and seed
  `useChat({ transport, messages: initialMessages })`.
- No other behavioral change; the existing per-commit re-key means each commit
  loads its own saved thread.

## Data Flow

1. Page render → load active commit's saved thread + the set of SHAs that have
   saved chats.
2. Timeline renders chat buttons with indicators; panel renders saved history.
3. User sends a message → `/api/chat` streams the answer → `onFinish` saves the
   full thread to `chat_messages`.
4. Switching commits re-renders the page → loads that commit's saved thread.

## Error Handling

- DB save failures in `/api/chat` are caught and logged; the stream/response is
  unaffected.
- Not-logged-in users: chat still works, persistence is skipped.
- No active commit: chat works (general mode), persistence is skipped.

## Testing

- **Unit tests** (pure, following existing `*.test.ts` conventions):
  - `UIMessage[]` ⇄ stored-row serialization helper.
  - Indicator-set construction (SHAs → `Set` lookup used by the row).
- DB-backed functions (`getChatMessages` / `saveChatMessages` /
  `getCommitsWithChats`) are exercised end-to-end via the chat route and page;
  no live-DB integration test is added (consistent with the current test suite,
  which is all pure).

## Files Touched

- `lib/postgres.ts` — new `chat_messages` table in `initDb`.
- `lib/db.ts` — `getChatMessages`, `saveChatMessages`, `getCommitsWithChats`,
  serialization helper + types.
- `app/api/chat/route.ts` — persist on finish (real + mock paths), with guards.
- `app/(app)/repos/[owner]/[name]/page.tsx` — load thread + saved-sha set, pass
  down.
- `components/timeline/timeline-graph.tsx` — drop `ScoreChip`, add chat button +
  indicator, new prop.
- `components/chat/chat-panel.tsx` — accept + seed `initialMessages`.
- New `*.test.ts` for the pure helpers.

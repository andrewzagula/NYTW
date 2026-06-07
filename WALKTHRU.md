# Walkthru

A developer tool that builds a comprehension layer on top of your git history. Connect your GitHub repo, get a visual timeline of every branch, PR, and commit — click into any one and ask questions or generate AI-powered summaries using your actual codebase as context. When you're ready to commit, the Walkthru CLI stops you first: summarize what you wrote, answer a question about it, get graded. Pass, and your commit goes through — along with your comprehension score, synced automatically to the web app.

For teams tired of shipping code nobody understands.

---

## The Problem

Code review exists to catch bugs. It doesn't exist to ensure the person who wrote the code actually understood what they were doing. Junior devs copy-paste from Stack Overflow or AI outputs. Senior devs move fast and forget the nuance. A week later, someone asks "why does this work?" and nobody knows — including the author.

Git history is the most complete record of what your team built and when. But it's almost entirely unreadable. Commit messages are noise. PRs close and context evaporates. Onboarding a new engineer means pointing them at a repo and hoping they figure it out.

Walkthru fixes both ends of this problem: it makes history navigable for readers, and it forces writers to demonstrate comprehension before their code ships.

---

## Product Architecture

Two surfaces, one data model:

**Walkthru Web App** — the comprehension dashboard. Connects to GitHub, visualizes git history, and surfaces AI-powered Q&A and summaries at the commit, PR, and branch level. This is where teams view comprehension scores, browse diffs with context, and understand the history of a codebase.

**Walkthru CLI** — a git hook wrapper. Registers new commits with the Walkthru API, prints a quiz URL for the developer, and lets the web app handle the comprehension check and score syncing.

---

## Web App

### Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Hosting**: Vercel (implied by project setup)
- **AI**: Anthropic Claude (for Q&A, summaries, grading)
- **Auth**: GitHub OAuth
- **Data**: Postgres (Neon) — users, repos, commits, scores, questions, answers

### GitHub Integration

Users connect their GitHub account via OAuth. Walkthru pulls:

- Repositories the user has access to
- All branches and their divergence points
- All PRs (open, merged, closed) with diffs and review comments
- All commits — message, diff, author, timestamp, parent chain

This data is stored and indexed so the AI layer has real context when answering questions or generating summaries. The GitHub webhook keeps it current — new pushes and PR events update the Walkthru record automatically.

### Visual Timeline

The core UI is a git timeline. Think of it as a readable, interactive version of `git log --all --graph` — but designed for humans, not terminals.

**Branch view**: Each active branch is a lane. Divergences and merges are rendered as actual graph nodes, not ASCII art. You can see at a glance how far a feature branch has drifted from main, which PRs are open against it, and who's been committing to it.

**Commit view**: Click any commit to open a panel showing:
- The full diff, syntax-highlighted, split or unified
- The commit message and author
- A one-paragraph AI-generated summary of what the change actually does (not just restating the diff)
- The comprehension score the author achieved when they committed (if they used the CLI)
- A Q&A interface — ask anything about this commit and get an answer grounded in the actual diff and surrounding code

**PR view**: Click any PR to see:
- All commits in the PR, in order
- The aggregate diff across all commits
- An AI-generated PR summary: what problem it solves, what approach it takes, what to watch out for
- All review comments with threading
- The comprehension scores of all authors who committed via the Walkthru CLI

**Branch comparison**: Select any two branches and get a side-by-side view of what diverged, when, and who wrote it.

### AI Q&A Layer

Every commit, PR, and branch has a persistent Q&A thread. Questions are answered by Claude with the actual diff and surrounding file context injected. Answers are cached — the same question asked by multiple team members returns the same grounded answer.

Example questions the system handles well:
- "Why was the retry logic changed to use exponential backoff here?"
- "Does this PR introduce any breaking changes to the public API?"
- "What does this middleware actually do, in plain English?"
- "Is there a race condition in this commit?"

The context window is constructed per-question: the full diff of the relevant commit, the files touched (current HEAD version), and the PR description if one exists. For branch-level questions, the aggregate diff since the branch point is used.

### Comprehension Score Dashboard

Every developer who uses the Walkthru CLI has a profile with:

- **Overall comprehension score** — rolling average across all commits in the past 30 days
- **Score per repository** — so you can see if someone scores well on the frontend but struggles with backend changes
- **Score trend** — are they improving over time?
- **Commit history with scores** — click any commit to see the question they were asked, their answer, and the grade

Team-level view aggregates individual scores so engineering leads can see where comprehension gaps exist across the whole team, without singling people out publicly.

---

## CLI Tool

### What It Does

The Walkthru CLI installs `post-commit` and `pre-push` git hooks. Every time a developer creates a commit, the `post-commit` hook registers the final commit SHA with the Walkthru API and prints a quiz URL. Before a push, the `pre-push` hook retries registration for outgoing commits that were not already registered locally.

The flow works like this:

1. The developer creates a commit
2. The CLI reads the final commit SHA, commit message, branch, remote URL, and commit diff
3. The CLI calls `POST /new-commit`
4. The API creates a web-based quiz for that commit and returns a URL
5. The CLI prints the URL in the terminal
6. The developer opens the URL and answers the quiz in the Walkthru web app
7. The web app stores the answer, score, and commit association

### Installation

```bash
npm install -g @walkthru/cli
walkthru login          # GitHub OAuth
walkthru init           # installs git hooks into the current repo
```

The hooks are written to `.git/hooks/post-commit` and `.git/hooks/pre-push` and call back into the CLI binary. `post-commit` is the primary hook because the final commit SHA exists at that point. `pre-push` is a backstop for commits that were created before hooks were installed or were not registered successfully.

### Configuration

`.walkthru.json` at the repo root controls behavior:

```json
{
  "includeDiff": true,
  "maxDiffBytes": 120000
}
```

- `includeDiff` — whether hook registration includes the commit patch
- `maxDiffBytes` — maximum diff payload size sent by the CLI before truncation

### Question Generation

Questions are not templates with blanks filled in. Claude reads the actual diff and generates a question that:

- Cannot be answered correctly by just reading the diff literally
- Requires understanding the purpose, not just the mechanics
- Is proportional to the complexity of the change — a one-liner gets a simple question, a 300-line refactor gets a harder one

Examples of generated questions for real-ish diffs:

> **For a caching change**: "You switched from a TTL-based cache to an LRU cache here. When would the old approach have caused stale data to be returned that the new approach avoids?"

> **For an API endpoint**: "This endpoint now returns a 422 instead of a 400 for validation errors. What's the semantic difference between those status codes, and which callers of this API need to handle the new behavior?"

> **For a database query**: "You added `.select(:id, :email)` to this query. What problem does this solve, and what would have happened without it at scale?"

### Grading Rubric

Claude grades on three dimensions, weighted equally:

1. **Accuracy** — is the answer factually correct about what the code does?
2. **Depth** — does the answer show understanding of _why_, not just _what_?
3. **Awareness** — does the answer acknowledge risks, edge cases, or downstream effects?

A score of 100 means the answer would satisfy a skeptical senior engineer in a code review. A score of 0 means the answer is wrong or shows no understanding. The rubric is applied consistently by sending the diff, question, and answer back to Claude with the scoring prompt.

### Terminal UX

The CLI should be brief: register the commit, show the quiz URL, and keep Git moving.

```
  $ git commit -m "feat: add retry policy"
  [main 4f3a8c2] feat: add retry policy

  Walkthru quiz for 4f3a8c2: https://walkthru.dev/q/4f3a8c2
```

Future CLI versions can render the quiz directly in the terminal, but the terminal should be another frontend for the backend quiz workflow. The backend remains responsible for question creation, answer submission, grading, and attempt storage; the CLI should not fork into a local-only quiz or grading system.

---

## Data Model

```
User
  id, github_id, github_username, email, created_at

Repository
  id, github_repo_id, owner, name, connected_at, webhook_secret

Branch
  id, repo_id, name, head_sha, updated_at

Commit
  id, repo_id, sha, author_user_id, message, diff_patch, committed_at

PullRequest
  id, repo_id, github_pr_number, title, body, state, author_user_id,
  base_branch, head_branch, merged_at

ComprehensionAttempt
  id, commit_id, user_id, question, answer, score, grading_notes,
  overridden, override_note, attempted_at

CachedAnswer
  id, repo_id, context_sha, question_hash, answer, created_at
```

Every comprehension attempt is stored. Overrides (commits that bypassed the gate) are flagged but not blocked from the web app — teams can see the pattern of skips over time.

---

## User Flows

### Setup Flow (Web App)

1. Sign up with GitHub OAuth
2. Select repositories to connect
3. Walkthru pulls existing history in the background (may take a few minutes for large repos)
4. Dashboard shows the visual timeline, initially with no comprehension scores
5. Invite teammates via email or GitHub username

### Setup Flow (CLI)

1. `npm install -g @walkthru/cli`
2. `walkthru login` — opens browser for GitHub OAuth, stores token locally
3. `cd your-repo && walkthru init` — installs the hooks, creates `.walkthru.json`
4. Optional: commit `.walkthru.json` so the team gets the same config

### Commit Flow (CLI)

1. Developer stages changes and runs `git commit`
2. Git writes the commit
3. The `post-commit` hook reads the final SHA, message, branch, remote URL, and diff
4. CLI calls `POST /new-commit`
5. API returns a quiz URL
6. CLI prints the URL for the developer
7. If registration fails, Git continues and `pre-push` retries outgoing commits later

### Review Flow (Web App)

1. Team lead opens the Walkthru dashboard for a repo
2. Sees the visual timeline — branches, PRs, commits color-coded by comprehension score
3. Clicks a low-scoring commit to see the diff, the question asked, and the answer given
4. Can ask follow-up questions in the Q&A thread ("was this actually correct?")
5. Can view the team comprehension trend for the past 30 days

---

## Phases

### Phase 1 — Foundation
- Next.js app scaffolding (done: project created)
- GitHub OAuth (web app)
- Repo connection + initial history pull
- Basic git timeline UI (branches, commits, no AI yet)
- Postgres schema and migrations

### Phase 2 — AI Layer (Web App)
- Commit and PR summaries (Claude)
- Per-commit Q&A interface with context injection
- Branch comparison view
- Cached answer storage

### Phase 3 — CLI
- CLI binary (`@walkthru/cli`)
- `post-commit` and `pre-push` hook installation
- Commit registration via API
- Quiz URL terminal output
- Local retry state for unregistered commits
- `.walkthru.json` configuration

### Phase 4 — Comprehension Dashboard
- Developer profiles with score history
- Team aggregated view
- Score trend charts
- Override/skip log visible to leads
- Per-repo score breakdown

### Phase 5 — Polish
- Webhooks for real-time updates (no manual refresh)
- Slack/GitHub PR comment integration (post comprehension score to PR)
- Onboarding flow and empty states
- Self-hosted option (Docker)

---

## Repo Structure

```
nytw/
├── WALKTHRU.md           # this document
├── walkthru-app/         # Next.js web application
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── package.json      # Next 16.2.7, React 19, Tailwind v4, TypeScript
│   └── next.config.ts
└── walkthru-cli/         # CLI tool (to be built)
```

---

## Design Principles

**Friction that teaches, not friction that blocks.** The CLI should get developers to the right quiz at the right time without breaking normal Git flow. The teaching moment happens in the web app, where the question, answer, score, and commit context can live together.

**Ground everything in the actual diff.** No AI feature in Walkthru should work on vibes. Every summary, question, answer, and grade is generated with the real code as context. If the context window doesn't fit the full diff, the most changed files get priority.

**Scores are coaching, not performance reviews.** The comprehension score is visible to team leads but the design discourages punitive use. Trend and improvement matter more than any single score. A 60 on a hard change is more valuable than a 90 on a one-liner.

**Zero friction for unavailable services.** Local Git should keep working if the Walkthru API or auth state is unavailable. Hooks should fail open, print a clear diagnostic, and retry registration at push time when possible.

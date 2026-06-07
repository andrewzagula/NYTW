# AI Chat Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible AI chat panel to the repo timeline page — a general "ask about this repo" assistant plus a `?commit=<sha>` commit-scoped assistant — backed by one `/api/chat` route that streams a scripted answer by default and upgrades to Claude + Perseus retrieval when keys are present, with no UI change.

**Architecture:** The repo page (`repos/[id]`) becomes a two-column split: existing `TimelineGraph` on the left, a client `ChatPanel` (`useChat`) on the right. The panel POSTs to `/api/chat`, passing `repoId` and the optional `commit` sha in the request body. The route assembles context (repo metadata + optional commit metadata + optional Perseus hits), then takes **one branch**: mock mode streams a scripted, context-aware answer via `simulateReadableStream` in the AI SDK UI-message-stream wire format; real mode (`ANTHROPIC_API_KEY` **and** `repo.perseusIndexId` both set) runs Perseus retrieval and streams Claude via `streamText(...).toUIMessageStreamResponse()`. Both paths emit the identical UI-message-stream protocol, so the client renders them the same way.

**Tech Stack:** Next.js 16.2.7 (App Router, route handlers, `await`ed `params`/`searchParams`), React 19, TypeScript, Tailwind v4. AI SDK v6 — `ai@6.0.197` (`streamText`, `convertToModelMessages`, `DefaultChatTransport`, `simulateReadableStream`), `@ai-sdk/react@3.0.199` (`useChat`), `@ai-sdk/anthropic@3.0.81` (`anthropic(modelId)`). Model `claude-opus-4-8` (overridable via `WALKTHRU_CHAT_MODEL`). Vitest for unit tests (new dev dependency). Perseus via the `perseus` CLI (real mode only).

> **Provider note:** The spec mandates the Vercel AI SDK (`@ai-sdk/anthropic`), which is already installed. That overrides the claude-api skill's "use the official Anthropic SDK" default (user/spec instructions take precedence). We still follow the claude-api model guidance: use exact id `claude-opus-4-8`, and do **not** pass `temperature`, `top_p`, `top_k`, or `budget_tokens` (all 400 on Opus 4.8). The `streamText` call sets only `model`, `system`, and `messages`.

> **Verified facts (do not "fix" from memory — these match the installed versions):**
> - v6 `useChat` does **not** manage input — use local `useState`. Send via `sendMessage({ text }, { body })`; render `message.parts` (text parts), not `message.content`. Hook is from `@ai-sdk/react`; `DefaultChatTransport`/`streamText`/`convertToModelMessages`/`simulateReadableStream` are from `ai`.
> - Route returns `streamText(...).toUIMessageStreamResponse()` (NOT `toDataStreamResponse`).
> - The mock SSE chunks use the UI-message-stream protocol with response header `x-vercel-ai-ui-message-stream: v1` and a trailing `data: [DONE]\n\n` (per `node_modules/ai/docs/03-ai-sdk-core/55-testing.mdx`).

---

## File Structure

**Create:**
- `vitest.config.ts` — test config with `@` alias + node environment.
- `lib/chat/context.ts` — pure context helpers: `ChatMode`, `PerseusHit`, `chatHeader`, `suggestedPrompts`, `buildSystemPrompt`, `lastUserText`, `scriptedMockAnswer`. No node/server imports (safe to import from both server and client).
- `lib/chat/context.test.ts` — unit tests for the above.
- `lib/chat/mock-stream.ts` — `buildMockChunks`, `mockUIMessageResponse` (scripted UI-message stream).
- `lib/chat/mock-stream.test.ts` — unit tests for `buildMockChunks`.
- `lib/perseus.ts` — `parsePerseusJson`, `queryIndex` (CLI wrapper, real mode only, never throws).
- `lib/perseus.test.ts` — unit tests for `parsePerseusJson`.
- `app/api/chat/route.ts` — POST handler; graceful model select; context assembly.
- `components/chat/chat-message.tsx` — render one `UIMessage`.
- `components/chat/chat-panel.tsx` — `"use client"` panel: `useChat`, composer, suggested prompts, header, desktop collapse + mobile drawer.

**Modify:**
- `lib/mock/repos.ts` — add `perseusIndexId?: string` to `MockRepo`.
- `lib/mock/timeline.ts` — add `getCommit(repoId, sha)` lookup.
- `components/timeline/timeline-graph.tsx` — accept `repoId` + `activeSha`; link each row to `?commit=<sha>`.
- `app/(app)/repos/[id]/page.tsx` — two-column split; `await searchParams`; pass props to `ChatPanel`.
- `package.json` — add `vitest` dev dep + `test` script.

---

## Task 1: Vitest harness

**Files:**
- Modify: `walkthru-app/package.json`
- Create: `walkthru-app/vitest.config.ts`
- Create: `walkthru-app/lib/chat/sanity.test.ts` (temporary — deleted in Step 5)

- [ ] **Step 1: Install vitest**

Run (from `walkthru-app/`):
```bash
npm install -D vitest
```
Expected: `vitest` added under devDependencies; exit 0.

- [ ] **Step 2: Add the test script**

Edit `walkthru-app/package.json` `scripts` — add a `test` line after `lint`:
```json
    "lint": "eslint",
    "test": "vitest run"
```

- [ ] **Step 3: Create the vitest config (resolves the `@` path alias)**

Create `walkthru-app/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 4: Write a sanity test and run it**

Create `walkthru-app/lib/chat/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 5: Delete the sanity test and commit**

```bash
rm walkthru-app/lib/chat/sanity.test.ts
git add walkthru-app/package.json walkthru-app/package-lock.json walkthru-app/vitest.config.ts
git commit -m "test: add vitest harness with @ path alias"
```

---

## Task 2: Mock data — Perseus index field + commit lookup

**Files:**
- Modify: `walkthru-app/lib/mock/repos.ts:3-16`
- Modify: `walkthru-app/lib/mock/timeline.ts:125-131`
- Test: `walkthru-app/lib/mock/timeline.test.ts`

- [ ] **Step 1: Write the failing test for `getCommit`**

Create `walkthru-app/lib/mock/timeline.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getCommit, getTimeline } from "@/lib/mock/timeline";

describe("getCommit", () => {
  it("returns the node matching a sha", () => {
    const node = getCommit("checkout-service", "a91c4e8");
    expect(node?.sha).toBe("a91c4e8");
    expect(node?.message).toContain("LRU");
  });

  it("returns undefined for an unknown sha", () => {
    expect(getCommit("checkout-service", "nope123")).toBeUndefined();
  });

  it("only returns shas that exist in the timeline", () => {
    const all = getTimeline("checkout-service").map((n) => n.sha);
    const node = getCommit("checkout-service", all[0]);
    expect(node).toBeDefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- timeline`
Expected: FAIL — `getCommit` is not exported.

- [ ] **Step 3: Add `getCommit` to `lib/mock/timeline.ts`**

Append after the existing `getBranches` function (currently `lib/mock/timeline.ts:129-131`):
```ts
export function getCommit(_repoId: string, sha: string): TimelineNode | undefined {
  return canonical.find((n) => n.sha === sha);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- timeline`
Expected: PASS — 3 passed.

- [ ] **Step 5: Add `perseusIndexId` to `MockRepo`**

In `walkthru-app/lib/mock/repos.ts`, add the field to the `MockRepo` type (after `teamScore` at line 15):
```ts
  /** Rolling team comprehension score, 0–100. */
  teamScore: number;
  /**
   * Perseus index id for this repo, set by the connect/webhook indexing jobs.
   * Left unset for mocks; when present (and ANTHROPIC_API_KEY is set), the chat
   * route grounds answers in real retrieval. One mock MAY point at a real public
   * repo's index id to demo real mode.
   */
  perseusIndexId?: string;
```
Do **not** set the field on any of the six mock repos (leave it `undefined` by default).

- [ ] **Step 6: Commit**

```bash
git add walkthru-app/lib/mock/repos.ts walkthru-app/lib/mock/timeline.ts walkthru-app/lib/mock/timeline.test.ts
git commit -m "feat: add getCommit lookup and perseusIndexId to mock data"
```

---

## Task 3: Chat context helpers (`lib/chat/context.ts`)

**Files:**
- Create: `walkthru-app/lib/chat/context.ts`
- Test: `walkthru-app/lib/chat/context.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `walkthru-app/lib/chat/context.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import {
  buildSystemPrompt,
  chatHeader,
  lastUserText,
  scriptedMockAnswer,
  suggestedPrompts,
  type PerseusHit,
} from "@/lib/chat/context";
import type { MockRepo } from "@/lib/mock/repos";
import type { TimelineNode } from "@/lib/mock/timeline";

const repo: MockRepo = {
  id: "checkout-service",
  owner: "northwind",
  name: "checkout-service",
  description: "Payments + cart orchestration for the storefront.",
  defaultBranch: "main",
  branchCount: 7,
  openPrs: 3,
  language: "TypeScript",
  lastActivity: "2026-06-07T00:00:00.000Z",
  teamScore: 82,
};

const commit: TimelineNode = {
  sha: "a91c4e8",
  message: "Replace TTL cache with LRU eviction",
  author: { name: "Priya Menon", initials: "PM" },
  date: "2026-06-06T00:00:00.000Z",
  branch: "feat/lru-cache",
  lane: 1,
  parents: ["e5b9c20"],
  score: 74,
  type: "commit",
};

function userMsg(text: string): UIMessage {
  return { id: "u1", role: "user", parts: [{ type: "text", text }] };
}

describe("chatHeader", () => {
  it("addresses the repo in general mode", () => {
    expect(chatHeader(repo, null)).toBe("Ask about northwind/checkout-service");
  });
  it("names the commit in commit mode", () => {
    expect(chatHeader(repo, commit)).toContain("a91c4e8");
  });
});

describe("suggestedPrompts", () => {
  it("returns repo-level prompts in general mode", () => {
    const prompts = suggestedPrompts(null);
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    expect(prompts.some((p) => /auth/i.test(p))).toBe(true);
  });
  it("returns change-focused prompts in commit mode", () => {
    const prompts = suggestedPrompts(commit);
    expect(prompts.some((p) => /break/i.test(p))).toBe(true);
  });
});

describe("buildSystemPrompt", () => {
  it("includes repo identity and notes missing retrieval", () => {
    const sys = buildSystemPrompt(repo, null, []);
    expect(sys).toContain("northwind/checkout-service");
    expect(sys).toMatch(/no retrieved code snippets/i);
  });
  it("includes the commit sha and message in commit mode", () => {
    const sys = buildSystemPrompt(repo, commit, []);
    expect(sys).toContain("a91c4e8");
    expect(sys).toContain("Replace TTL cache with LRU eviction");
  });
  it("embeds Perseus hits when present", () => {
    const hits: PerseusHit[] = [
      { path: "src/cache.ts", lineStart: 10, lineEnd: 20, snippet: "class LruCache {}" },
    ];
    const sys = buildSystemPrompt(repo, null, hits);
    expect(sys).toContain("src/cache.ts:10-20");
    expect(sys).toContain("class LruCache {}");
  });
});

describe("lastUserText", () => {
  it("extracts the most recent user text", () => {
    const messages: UIMessage[] = [
      userMsg("first"),
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "reply" }] },
      userMsg("second question"),
    ];
    expect(lastUserText(messages)).toBe("second question");
  });
  it("returns empty string when there is no user message", () => {
    expect(lastUserText([])).toBe("");
  });
});

describe("scriptedMockAnswer", () => {
  it("references the repo in general mode", () => {
    const answer = scriptedMockAnswer(repo, null, "what does this do?");
    expect(answer).toContain("northwind/checkout-service");
  });
  it("references the commit sha in commit mode", () => {
    const answer = scriptedMockAnswer(repo, commit, "why?");
    expect(answer).toContain("a91c4e8");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- context`
Expected: FAIL — `@/lib/chat/context` not found.

- [ ] **Step 3: Implement `lib/chat/context.ts`**

Create `walkthru-app/lib/chat/context.ts`:
```ts
import type { UIMessage } from "ai";
import type { MockRepo } from "@/lib/mock/repos";
import type { TimelineNode } from "@/lib/mock/timeline";

export type ChatMode = "general" | "commit";

export type PerseusHit = {
  path: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
};

export function chatMode(commit: TimelineNode | null): ChatMode {
  return commit ? "commit" : "general";
}

export function chatHeader(repo: MockRepo, commit: TimelineNode | null): string {
  if (commit) return `Commit ${commit.sha}`;
  return `Ask about ${repo.owner}/${repo.name}`;
}

export function suggestedPrompts(commit: TimelineNode | null): string[] {
  if (commit) {
    return [
      "Why was this change made?",
      "What could break because of it?",
      "Summarize this commit for a teammate.",
    ];
  }
  return [
    "What does this service do?",
    "Where is auth handled?",
    "What changed most recently?",
  ];
}

export function buildSystemPrompt(
  repo: MockRepo,
  commit: TimelineNode | null,
  hits: PerseusHit[],
): string {
  const lines: string[] = [
    `You are Walkthru's code assistant for the repository ${repo.owner}/${repo.name}.`,
    repo.description ? `Repository summary: ${repo.description}` : "",
    `Default branch: ${repo.defaultBranch}. Primary language: ${repo.language}.`,
    "Answer questions about this codebase clearly and concisely. Ground every claim in the provided context; if the context does not cover something, say so rather than guessing.",
  ];

  if (commit) {
    lines.push(
      "",
      "The user is asking about a specific commit:",
      `- SHA: ${commit.sha}`,
      `- Message: ${commit.message}`,
      `- Author: ${commit.author.name}`,
      `- Branch: ${commit.branch}`,
      commit.score !== null
        ? `- Comprehension score: ${commit.score}/100`
        : "- Comprehension score: not gated",
      "Focus on this change: its intent, its risks, and what a reviewer should check.",
    );
  }

  if (hits.length > 0) {
    lines.push("", "Relevant code from the repository:");
    for (const h of hits) {
      lines.push(`--- ${h.path}:${h.lineStart}-${h.lineEnd} ---`, h.snippet);
    }
  } else {
    lines.push(
      "",
      "No retrieved code snippets are available for this question; answer from the metadata above and note that limitation to the user.",
    );
  }

  return lines.filter(Boolean).join("\n");
}

export function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
  }
  return "";
}

export function scriptedMockAnswer(
  repo: MockRepo,
  commit: TimelineNode | null,
  question: string,
): string {
  const repoName = `${repo.owner}/${repo.name}`;
  const q = question ? `“${question}”` : "your question";

  if (commit) {
    return [
      `Looking at commit \`${commit.sha}\` in **${repoName}** — _${commit.message}_.`,
      ``,
      `This is a demo response (no live model or retrieval yet). The change touches ${repo.language} code on the \`${commit.branch}\` branch. To answer ${q} against the real diff, set \`ANTHROPIC_API_KEY\` and give this repo a \`perseusIndexId\` — then I'll ground the explanation in the actual code.`,
      ``,
      commit.score !== null
        ? `It cleared the comprehension gate with a score of ${commit.score}/100.`
        : `It was committed without the comprehension gate, so there's no recorded score.`,
    ].join("\n");
  }

  return [
    `You're asking about **${repoName}** (${repo.language}). ${repo.description}`,
    ``,
    `This is a demo response — Walkthru streams a scripted answer until a model and Perseus retrieval are wired up. Once \`ANTHROPIC_API_KEY\` and a \`perseusIndexId\` are set for this repo, I'll answer ${q} grounded in the real code.`,
  ].join("\n");
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test -- context`
Expected: PASS — all green.

- [ ] **Step 5: Commit**

```bash
git add walkthru-app/lib/chat/context.ts walkthru-app/lib/chat/context.test.ts
git commit -m "feat: add chat context helpers (system prompt, prompts, mock answer)"
```

---

## Task 4: Mock UI-message stream (`lib/chat/mock-stream.ts`)

**Files:**
- Create: `walkthru-app/lib/chat/mock-stream.ts`
- Test: `walkthru-app/lib/chat/mock-stream.test.ts`

- [ ] **Step 1: Write the failing test**

Create `walkthru-app/lib/chat/mock-stream.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildMockChunks } from "@/lib/chat/mock-stream";

describe("buildMockChunks", () => {
  const chunks = buildMockChunks("hello world");

  it("opens with a start frame and a text-start frame", () => {
    expect(chunks[0]).toContain('"type":"start"');
    expect(chunks[1]).toContain('"type":"text-start"');
  });

  it("ends with text-end, finish, then [DONE]", () => {
    expect(chunks.at(-3)).toContain('"type":"text-end"');
    expect(chunks.at(-2)).toContain('"type":"finish"');
    expect(chunks.at(-1)).toContain("[DONE]");
  });

  it("streams the full answer across text-delta frames", () => {
    const reconstructed = chunks
      .filter((c) => c.includes('"text-delta"'))
      .map((c) => JSON.parse(c.replace(/^data: /, "").trim()).delta)
      .join("");
    expect(reconstructed).toBe("hello world");
  });

  it("escapes JSON-unsafe text", () => {
    const c = buildMockChunks('a "quote" and \n newline');
    const reconstructed = c
      .filter((x) => x.includes('"text-delta"'))
      .map((x) => JSON.parse(x.replace(/^data: /, "").trim()).delta)
      .join("");
    expect(reconstructed).toBe('a "quote" and \n newline');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- mock-stream`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/chat/mock-stream.ts`**

Create `walkthru-app/lib/chat/mock-stream.ts`:
```ts
import { simulateReadableStream } from "ai";

/**
 * Build AI SDK UI-message-stream SSE lines for a scripted answer. The wire
 * format matches `streamText(...).toUIMessageStreamResponse()` so the client
 * (`useChat`) consumes mock and real responses identically.
 * See node_modules/ai/docs/03-ai-sdk-core/55-testing.mdx.
 */
export function buildMockChunks(answer: string): string[] {
  const id = "0";
  // Split into word+trailing-whitespace runs so the answer reconstructs exactly.
  const words = answer.match(/\S+\s*|\s+/g) ?? [answer];
  return [
    `data: ${JSON.stringify({ type: "start" })}\n\n`,
    `data: ${JSON.stringify({ type: "text-start", id })}\n\n`,
    ...words.map(
      (delta) => `data: ${JSON.stringify({ type: "text-delta", id, delta })}\n\n`,
    ),
    `data: ${JSON.stringify({ type: "text-end", id })}\n\n`,
    `data: ${JSON.stringify({ type: "finish" })}\n\n`,
    `data: [DONE]\n\n`,
  ];
}

/** Stream a scripted answer as a UI-message-stream Response (mock mode). */
export function mockUIMessageResponse(answer: string): Response {
  return new Response(
    simulateReadableStream({
      initialDelayInMs: 150,
      chunkDelayInMs: 18,
      chunks: buildMockChunks(answer),
    }).pipeThrough(new TextEncoderStream()),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    },
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- mock-stream`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add walkthru-app/lib/chat/mock-stream.ts walkthru-app/lib/chat/mock-stream.test.ts
git commit -m "feat: add scripted UI-message-stream mock response"
```

---

## Task 5: Perseus wrapper (`lib/perseus.ts`)

**Files:**
- Create: `walkthru-app/lib/perseus.ts`
- Test: `walkthru-app/lib/perseus.test.ts`

- [ ] **Step 1: Write the failing test**

Create `walkthru-app/lib/perseus.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parsePerseusJson } from "@/lib/perseus";

describe("parsePerseusJson", () => {
  it("maps hits from perseus --json output", () => {
    const stdout = JSON.stringify({
      hits: [
        { path: "src/cache.ts", line_start: 10, line_end: 22, score: 0.9, snippet: "class LruCache {}" },
      ],
    });
    const hits = parsePerseusJson(stdout);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toEqual({
      path: "src/cache.ts",
      lineStart: 10,
      lineEnd: 22,
      snippet: "class LruCache {}",
    });
  });

  it("returns [] for empty hits", () => {
    expect(parsePerseusJson(JSON.stringify({ hits: [] }))).toEqual([]);
  });

  it("returns [] for malformed output rather than throwing", () => {
    expect(parsePerseusJson("not json")).toEqual([]);
    expect(parsePerseusJson("{}")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- perseus`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/perseus.ts`**

Create `walkthru-app/lib/perseus.ts`:
```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PerseusHit } from "@/lib/chat/context";

const run = promisify(execFile);

type RawHit = {
  path: string;
  line_start: number;
  line_end: number;
  snippet: string;
};

export function parsePerseusJson(stdout: string): PerseusHit[] {
  try {
    const data = JSON.parse(stdout) as { hits?: RawHit[] };
    if (!Array.isArray(data.hits)) return [];
    return data.hits.map((h) => ({
      path: h.path,
      lineStart: h.line_start,
      lineEnd: h.line_end,
      snippet: h.snippet,
    }));
  } catch {
    return [];
  }
}

/**
 * Query a Perseus index for code relevant to `question`. Real mode only.
 * Never throws — returns [] on any failure so chat degrades gracefully
 * (a Perseus miss/error must not hard-fail the chat).
 *
 * Production can call the Perseus HTTP API directly (PERSEUS_API_URL /
 * PERSEUS_TOKEN); this CLI wrapper is the dev/default path.
 */
export async function queryIndex(
  indexId: string,
  question: string,
  topK = 5,
): Promise<PerseusHit[]> {
  if (!question.trim()) return [];
  try {
    const { stdout } = await run(
      "perseus",
      ["query", indexId, question, "--json", "--no-summary", "-k", String(topK)],
      { timeout: 15_000, maxBuffer: 8 * 1024 * 1024, env: process.env },
    );
    return parsePerseusJson(stdout);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- perseus`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add walkthru-app/lib/perseus.ts walkthru-app/lib/perseus.test.ts
git commit -m "feat: add graceful Perseus query wrapper"
```

---

## Task 6: Chat route (`app/api/chat/route.ts`)

**Files:**
- Create: `walkthru-app/app/api/chat/route.ts`

This task has no unit test (it streams I/O); it is verified by typecheck (Task 11 Step 1) and the dev smoke test (Task 11 Step 4). Each function it calls is already unit-tested.

- [ ] **Step 1: Implement the route**

Create `walkthru-app/app/api/chat/route.ts`:
```ts
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getRepo } from "@/lib/mock/repos";
import { getCommit } from "@/lib/mock/timeline";
import {
  buildSystemPrompt,
  lastUserText,
  scriptedMockAnswer,
  type PerseusHit,
} from "@/lib/chat/context";
import { mockUIMessageResponse } from "@/lib/chat/mock-stream";
import { queryIndex } from "@/lib/perseus";

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

// claude-api skill default. No temperature/budget_tokens (both 400 on Opus 4.8).
const MODEL = process.env.WALKTHRU_CHAT_MODEL ?? "claude-opus-4-8";

type ChatRequest = {
  messages: UIMessage[];
  repoId?: string;
  commit?: string;
};

export async function POST(req: Request) {
  const { messages, repoId, commit }: ChatRequest = await req.json();

  const repo = repoId ? getRepo(repoId) : undefined;

  // Unknown repo → answer gracefully, never hard-fail.
  if (!repo) {
    return mockUIMessageResponse(
      "I couldn't find that repository, so I can't ground an answer in its code. Open a repo from the dashboard and try again.",
    );
  }

  const commitNode = commit ? getCommit(repo.id, commit) ?? null : null;
  const question = lastUserText(messages);

  // Real mode requires BOTH a key and a perseus index id for this repo.
  const realMode = Boolean(process.env.ANTHROPIC_API_KEY && repo.perseusIndexId);

  if (!realMode) {
    return mockUIMessageResponse(scriptedMockAnswer(repo, commitNode, question));
  }

  let hits: PerseusHit[] = [];
  if (repo.perseusIndexId) {
    // queryIndex never throws — a miss returns [] and we answer without code context.
    hits = await queryIndex(repo.perseusIndexId, question);
  }

  const result = streamText({
    model: anthropic(MODEL),
    system: buildSystemPrompt(repo, commitNode, hits),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onError: () => "The assistant hit an error. Please retry.",
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add walkthru-app/app/api/chat/route.ts
git commit -m "feat: add /api/chat route with graceful mock/real model select"
```

---

## Task 7: Chat message component (`components/chat/chat-message.tsx`)

**Files:**
- Create: `walkthru-app/components/chat/chat-message.tsx`

- [ ] **Step 1: Implement the component**

Create `walkthru-app/components/chat/chat-message.tsx`:
```tsx
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {isUser ? "you" : "◢ walkthru"}
      </span>
      <div
        className={cn(
          "max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-secondary text-foreground"
            : "border border-border bg-card/40 text-foreground",
        )}
      >
        {text || <span className="text-muted-foreground">…</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add walkthru-app/components/chat/chat-message.tsx
git commit -m "feat: add chat message bubble component"
```

---

## Task 8: Chat panel component (`components/chat/chat-panel.tsx`)

**Files:**
- Create: `walkthru-app/components/chat/chat-panel.tsx`

- [ ] **Step 1: Implement the panel**

Create `walkthru-app/components/chat/chat-panel.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, MessageSquare, PanelRightClose, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./chat-message";

type ChatPanelProps = {
  repoId: string;
  commitSha: string | null;
  mode: "general" | "commit";
  header: string;
  commitMessage?: string | null;
  suggestions: string[];
};

export function ChatPanel({
  repoId,
  commitSha,
  mode,
  header,
  commitMessage,
  suggestions,
}: ChatPanelProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport,
  });
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false); // desktop
  const [openMobile, setOpenMobile] = useState(false); // drawer

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t }, { body: { repoId, commit: commitSha ?? undefined } });
    setInput("");
  }

  const panel = (
    <div className="flex h-full flex-col bg-card/20">
      {/* header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-vermillion">
            {mode === "commit" ? "Commit chat" : "Repo chat"}
          </p>
          <p className="truncate font-mono text-sm text-foreground">{header}</p>
          {mode === "commit" && commitMessage && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {commitMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setCollapsed(true);
            setOpenMobile(false);
          }}
          aria-label="Collapse chat"
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelRightClose className="hidden h-4 w-4 lg:block" />
          <X className="h-4 w-4 lg:hidden" />
        </button>
      </div>

      {/* thread */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask anything about this {mode === "commit" ? "commit" : "repository"}.
              Answers are grounded in the connected repo.
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-card/40 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            <span className="text-muted-foreground">The assistant hit an error.</span>
            <button
              type="button"
              onClick={() => regenerate()}
              className="inline-flex items-center gap-1 font-mono text-xs text-vermillion hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 focus-within:border-vermillion/60">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about this code…"
            className="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-vermillion text-hero-ink transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: sticky right column. top-16 / 4rem must match the (app) nav height — verify in app/(app)/layout.tsx. */}
      <aside
        className={cn(
          "hidden shrink-0 border-l border-border lg:block",
          collapsed ? "lg:w-0 lg:border-l-0" : "lg:w-[400px]",
        )}
      >
        {!collapsed && (
          <div className="sticky top-16 h-[calc(100vh-4rem)]">{panel}</div>
        )}
      </aside>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2 rounded-l-lg border border-r-0 border-border bg-card px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-vermillion transition-colors hover:bg-accent lg:flex"
        >
          <MessageSquare className="h-4 w-4" /> Chat
        </button>
      )}

      {/* Mobile (< lg): floating button + drawer */}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-vermillion px-4 py-3 font-mono text-xs uppercase tracking-widest text-hero-ink shadow-lg lg:hidden"
      >
        <MessageSquare className="h-4 w-4" /> Ask
      </button>
      {openMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenMobile(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-background">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add walkthru-app/components/chat/chat-panel.tsx
git commit -m "feat: add ChatPanel (useChat, suggestions, collapse + mobile drawer)"
```

---

## Task 9: Timeline rows link to `?commit=<sha>`

**Files:**
- Modify: `walkthru-app/components/timeline/timeline-graph.tsx`

- [ ] **Step 1: Add imports and props**

In `walkthru-app/components/timeline/timeline-graph.tsx`, add a `Link` import at the top (after line 1):
```tsx
import Link from "next/link";
import { relativeTime } from "@/lib/format";
```

Change the component signature (currently line 29) from:
```tsx
export function TimelineGraph({ nodes }: { nodes: TimelineNode[] }) {
```
to:
```tsx
export function TimelineGraph({
  nodes,
  repoId,
  activeSha,
}: {
  nodes: TimelineNode[];
  repoId: string;
  activeSha?: string;
}) {
```

- [ ] **Step 2: Wrap each row's content in a Link to `?commit=<sha>`**

Replace the existing `<li>` block (currently `components/timeline/timeline-graph.tsx:115-164`) with this version — the row content moves into a `<Link>` and the active commit gets a vermillion edge + tint:
```tsx
        {nodes.map((n) => (
          <li
            key={n.sha}
            style={{ height: ROW, paddingLeft: GUTTER }}
            className="border-b border-border/40 last:border-b-0"
          >
            <Link
              href={`/repos/${repoId}?commit=${n.sha}`}
              scroll={false}
              aria-current={n.sha === activeSha ? "true" : undefined}
              className={`flex h-full min-w-0 items-center gap-4 pr-1 transition-colors ${
                n.sha === activeSha
                  ? "bg-vermillion/5 shadow-[inset_3px_0_0_0_var(--color-vermillion)]"
                  : "hover:bg-accent/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <code className="rounded border border-border bg-card/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {n.sha}
                  </code>
                  {n.type === "merge" && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-vermillion">
                      merge
                    </span>
                  )}
                  {n.lane === 1 && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {n.branch}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1.5 truncate text-sm ${
                    n.type === "merge" ? "italic text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {n.message}
                </p>
              </div>

              <div className="hidden items-center gap-2.5 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-foreground">
                  {n.author.initials}
                </span>
                <span className="w-24 truncate text-xs text-muted-foreground">
                  {n.author.name}
                </span>
              </div>

              <span className="hidden w-20 shrink-0 text-right font-mono text-xs text-zinc-600 md:block">
                {relativeTime(n.date)}
              </span>

              <div className="w-[88px] shrink-0 text-right">
                <ScoreChip score={n.score} />
              </div>
            </Link>
          </li>
        ))}
```

> Note: the SVG graph overlay (`components/timeline/timeline-graph.tsx:46-112`) is unchanged — it stays absolutely positioned over the `<ul>`, and the rows keep `paddingLeft: GUTTER`, so the dots still line up with each row.

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: errors only about `TimelineGraph` now **requiring** `repoId` at its call site in `page.tsx` (fixed in Task 10). No errors inside `timeline-graph.tsx` itself.

- [ ] **Step 4: Commit**

```bash
git add walkthru-app/components/timeline/timeline-graph.tsx
git commit -m "feat: link timeline rows to ?commit=<sha> with active highlight"
```

---

## Task 10: Repo page split layout + commit mode

**Files:**
- Modify: `walkthru-app/app/(app)/repos/[id]/page.tsx`

- [ ] **Step 1: Replace the page with the split-workspace version**

Replace the entire contents of `walkthru-app/app/(app)/repos/[id]/page.tsx` with:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, GitPullRequest } from "lucide-react";
import { getRepo } from "@/lib/mock/repos";
import { getBranches, getCommit, getTimeline } from "@/lib/mock/timeline";
import { TimelineGraph } from "@/components/timeline/timeline-graph";
import { BranchSwitcher } from "@/components/timeline/branch-switcher";
import { ScoreChip } from "@/components/shared/score-chip";
import { ChatPanel } from "@/components/chat/chat-panel";
import { chatHeader, suggestedPrompts } from "@/lib/chat/context";

export default async function RepoTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { id } = await params;
  const { commit } = await searchParams;
  const repo = getRepo(id);
  if (!repo) notFound();

  const nodes = getTimeline(id);
  const branches = getBranches(id);
  const commitNode = commit ? getCommit(id, commit) ?? null : null;

  return (
    <div className="flex">
      <main className="min-w-0 flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <header className="mt-5 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-mono text-xl">
              <span className="text-muted-foreground">{repo.owner}/</span>
              <span className="font-semibold text-foreground">{repo.name}</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {repo.description}
            </p>
            <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                {repo.branchCount} branches
              </span>
              <span className="flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5" />
                {repo.openPrs} open PRs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Team score
              </p>
              <div className="mt-1.5 flex justify-end">
                <ScoreChip score={repo.teamScore} />
              </div>
            </div>
            <BranchSwitcher branches={branches} defaultBranch={repo.defaultBranch} />
          </div>
        </header>

        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-vermillion">
            ◢ Commit timeline
          </p>
          <div className="overflow-hidden rounded-xl border border-border bg-card/20 px-2 py-2 sm:px-4">
            <TimelineGraph
              nodes={nodes}
              repoId={repo.id}
              activeSha={commitNode?.sha}
            />
          </div>
        </div>
      </main>

      <ChatPanel
        repoId={repo.id}
        commitSha={commitNode?.sha ?? null}
        mode={commitNode ? "commit" : "general"}
        header={chatHeader(repo, commitNode)}
        commitMessage={commitNode?.message ?? null}
        suggestions={suggestedPrompts(commitNode)}
      />
    </div>
  );
}
```

> Changes vs. the original: the outer wrapper is now `<div className="flex">` instead of a centered `max-w-5xl` main; the `main` is `flex-1` so the timeline fills the space left of the panel; `searchParams` is awaited; `TimelineGraph` receives `repoId`/`activeSha`; `<ChatPanel>` renders as the right column. The header/timeline markup is otherwise unchanged.

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS — no errors (the Task 9 call-site error is now resolved).

- [ ] **Step 3: Commit**

```bash
git add "walkthru-app/app/(app)/repos/[id]/page.tsx"
git commit -m "feat: split repo page into timeline + chat panel, read ?commit"
```

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run (from `walkthru-app/`): `npx tsc --noEmit`
Expected: no errors.

> If `await convertToModelMessages(messages)` produces a type error, drop the `await` (it returns `ModelMessage[]` synchronously in this version): `messages: convertToModelMessages(messages)`. The official docs show `await`; awaiting a non-promise is harmless, so prefer leaving it unless tsc complains.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (warnings tolerable).

- [ ] **Step 3: Unit tests + production build**

Run: `npm test`
Expected: all suites pass (timeline, context, mock-stream, perseus).

Run: `npm run build`
Expected: build succeeds; `/api/chat` appears as a route and `/repos/[id]` builds.

- [ ] **Step 4: Dev smoke test — mock mode (default, no key)**

Start the app: `npm run dev` (background), then:

Route streams SSE:
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"repoId":"checkout-service","messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"what does this service do?"}]}]}'
```
Expected: `data: {"type":"start"}`, several `data: {"type":"text-delta",...}` frames whose text mentions `northwind/checkout-service`, then `data: {"type":"finish"}` and `data: [DONE]`.

Commit mode:
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"repoId":"checkout-service","commit":"a91c4e8","messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"why this change?"}]}]}'
```
Expected: the streamed text references commit `a91c4e8` and "Replace TTL cache with LRU eviction".

Then in a browser, confirm:
- `/repos/checkout-service` → right-hand panel, header "Ask about northwind/checkout-service", repo-level suggested prompts; sending a message streams a reply.
- Clicking a timeline row navigates to `/repos/checkout-service?commit=<sha>` (no full scroll jump), that row highlights, and the panel switches to "Commit chat" with commit-focused prompts.
- Desktop: the collapse button hides the panel to a "Chat" reopen strip; reopening restores it.
- Narrow viewport (< lg): the panel is hidden, an "Ask" floating button opens it as a drawer; the X closes it.

> If the sticky panel's top edge doesn't sit flush under the app nav, adjust `top-16` and `h-[calc(100vh-4rem)]` in `chat-panel.tsx` to the actual `app/(app)/layout.tsx` nav height.

- [ ] **Step 5: (Optional) Real mode check**

Real mode only activates with **both** `ANTHROPIC_API_KEY` set and the repo carrying a `perseusIndexId`. To verify without a real index, temporarily set `perseusIndexId` on the `checkout-service` mock and export `ANTHROPIC_API_KEY`, restart dev, and confirm the same `/api/chat` call now streams a Claude response (Perseus returns `[]` gracefully if the id isn't a real index, and the answer notes the missing code context). Revert the temporary mock edit afterward. **No UI change** between mock and real is the success condition.

- [ ] **Step 6: Final commit (if any verification fixes were made)**

```bash
git add -A
git commit -m "fix: verification adjustments for AI chat panel"
```

---

## Spec coverage check (§11 → tasks)

- §11.2 split layout (timeline left / collapsible ~400px panel right; drawer < lg) → Tasks 8, 10.
- §11.3 two modes via URL; general vs commit header + prompts; rows link to `?commit`; `await searchParams` → Tasks 3, 9, 10.
- §11.4 graceful backend, one path two brains; mock default, real opt-in on key + index; same UI → Tasks 4, 6.
- §11.5/§11.7 `lib/perseus.ts` query wrapper; route looks up `repo.perseusIndexId` → Tasks 5, 6.
- §11.6 AI SDK v6 `useChat` + `streamText().toUIMessageStreamResponse()`; mock via `simulateReadableStream`; model `claude-opus-4-8` via `WALKTHRU_CHAT_MODEL`; direct Anthropic provider → Tasks 4, 6, 8.
- §11.7 files: `app/api/chat/route.ts`, `lib/perseus.ts`, `lib/chat/context.ts`, `components/chat/*`, edited repo page, `perseusIndexId` on `MockRepo` → Tasks 2–10.
- §11.8 `perseusIndexId?` on `MockRepo`, unset by default → Task 2.
- §11.9 Perseus miss → answer without context (noted); LLM error → inline retry; mock never hard-fails → Tasks 3, 5, 6, 8.
- §11.11 success criteria → Task 11.
- §11.10/§11.12 caveats/deferred (chat persistence, answer caching, private-repo clone auth) → intentionally out of scope.

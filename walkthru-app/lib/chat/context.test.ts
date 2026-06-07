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

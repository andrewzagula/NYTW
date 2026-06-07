import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import {
  buildSystemPrompt,
  chatHeader,
  lastUserText,
  scriptedMockAnswer,
  suggestedPrompts,
  type ChatRepo,
  type ChatCommit,
} from "@/lib/chat/context";

const repo: ChatRepo = {
  owner: "northwind",
  name: "checkout-service",
  description: "Payments + cart orchestration for the storefront.",
  defaultBranch: "main",
  language: "TypeScript",
};

const commit: ChatCommit = {
  sha: "a91c4e8abc",
  message: "Replace TTL cache with LRU eviction",
  author: "Priya Menon",
  branch: "feat/lru-cache",
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
  it("includes repo identity", () => {
    const sys = buildSystemPrompt(repo, null);
    expect(sys).toContain("northwind/checkout-service");
    expect(sys).toContain("TypeScript");
  });
  it("includes the commit sha and message in commit mode", () => {
    const sys = buildSystemPrompt(repo, commit);
    expect(sys).toContain("a91c4e8abc");
    expect(sys).toContain("Replace TTL cache with LRU eviction");
  });
  it("embeds the diff when present", () => {
    const sys = buildSystemPrompt(repo, { ...commit, diff: "+ const x = 1;" });
    expect(sys).toContain("+ const x = 1;");
    expect(sys).toMatch(/```diff/);
  });
  it("notes a missing diff in commit mode", () => {
    const sys = buildSystemPrompt(repo, commit);
    expect(sys).toMatch(/no diff/i);
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

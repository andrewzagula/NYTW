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
      .map((p) => (p.type === "text" ? (p as { type: "text"; text: string }).text : ""))
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
      `This is a demo response (no live model or retrieval yet). The change touches ${repo.language} code on the \`${commit.branch}\` branch. To answer ${q} against the real diff, set \`ANTHROPIC_API_KEY\` and give this repo a \`perseusIndexId\` — then I’ll ground the explanation in the actual code.`,
      ``,
      commit.score !== null
        ? `It cleared the comprehension gate with a score of ${commit.score}/100.`
        : `It was committed without the comprehension gate, so there’s no recorded score.`,
    ].join("\n");
  }

  return [
    `You’re asking about **${repoName}** (${repo.language}). ${repo.description}`,
    ``,
    `This is a demo response — Walkthru streams a scripted answer until a model and Perseus retrieval are wired up. Once \`ANTHROPIC_API_KEY\` and a \`perseusIndexId\` are set for this repo, I’ll answer ${q} grounded in the real code.`,
  ].join("\n");
}

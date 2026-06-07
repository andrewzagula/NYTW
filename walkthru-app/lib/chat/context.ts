import type { UIMessage } from "ai";

/** Minimal repo shape the chat context needs — owner/name are required, the rest optional. */
export type ChatRepo = {
  owner: string;
  name: string;
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
};

export type ChatCommit = {
  sha: string;
  message: string;
  author: string;
  branch?: string;
  /** Truncated unified diff for the commit, if available. */
  diff?: string;
};

export type ChatMode = "general" | "commit";

export function chatMode(commit: ChatCommit | null): ChatMode {
  return commit ? "commit" : "general";
}

export function chatHeader(repo: ChatRepo, commit: ChatCommit | null): string {
  if (commit) return `Commit ${commit.sha.slice(0, 7)}`;
  return `Ask about ${repo.owner}/${repo.name}`;
}

export function suggestedPrompts(commit: ChatCommit | null): string[] {
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

/** A code snippet retrieved from perseus, in the shape the prompt embeds. */
export type RetrievedHit = {
  path: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
};

export function buildSystemPrompt(
  repo: ChatRepo,
  commit: ChatCommit | null,
  hits: RetrievedHit[] = [],
): string {
  const lines: string[] = [
    `You are Walkthru's code assistant for the repository ${repo.owner}/${repo.name}.`,
    ...(repo.description ? [`Repository summary: ${repo.description}`] : []),
    repo.defaultBranch
      ? `Default branch: ${repo.defaultBranch}.${repo.language ? ` Primary language: ${repo.language}.` : ""}`
      : repo.language
        ? `Primary language: ${repo.language}.`
        : "",
    "Answer questions about this codebase clearly and concisely. Ground every claim in the provided context; if the context does not cover something, say so rather than guessing.",
  ].filter(Boolean);

  if (commit) {
    lines.push(
      "",
      "The user is asking about a specific commit:",
      `- SHA: ${commit.sha}`,
      `- Message: ${commit.message}`,
      `- Author: ${commit.author}`,
      ...(commit.branch ? [`- Branch: ${commit.branch}`] : []),
      "Focus on this change: its intent, its risks, and what a reviewer should check.",
    );
    if (commit.diff) {
      lines.push("", "Diff for this commit:", "```diff", commit.diff, "```");
    } else {
      lines.push(
        "",
        "No diff is available for this commit; answer from the metadata above.",
      );
    }
  }

  if (hits.length > 0) {
    lines.push("", "Relevant code retrieved from the repository:");
    for (const h of hits) {
      lines.push(`--- ${h.path}:${h.lineStart}-${h.lineEnd} ---`, h.snippet);
    }
  }

  return lines.join("\n");
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
  repo: ChatRepo,
  commit: ChatCommit | null,
  question: string,
): string {
  const repoName = `${repo.owner}/${repo.name}`;
  const q = question ? `"${question}"` : "your question";

  if (commit) {
    return [
      `Looking at commit \`${commit.sha.slice(0, 7)}\` in **${repoName}** — _${commit.message}_.`,
      ``,
      `This is a demo response (no live model wired up). To answer ${q} against the real diff, set \`ANTHROPIC_API_KEY\` and I'll ground the explanation in the actual code.`,
    ].join("\n");
  }

  return [
    `You're asking about **${repoName}**${repo.description ? ` — ${repo.description}` : ""}.`,
    ``,
    `This is a demo response — Walkthru streams a scripted answer until a model is wired up. Once \`ANTHROPIC_API_KEY\` is set, I'll answer ${q} grounded in the real code.`,
  ].join("\n");
}

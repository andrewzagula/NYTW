import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, GitBranch } from "lucide-react";
import { TimelineGraph } from "@/components/timeline/timeline-graph";
import { CommitDiff } from "@/components/timeline/commit-diff";
import { QuizPanel } from "@/components/quiz/quiz-panel";
import {
  chatHeader,
  chatMode,
  suggestedPrompts,
  type ChatRepo,
  type ChatCommit,
} from "@/lib/chat/context";
import { getSessionUser, getGithubToken } from "@/lib/auth/server";
import {
  getChatMessages,
  getCommitsWithChats,
  getRepoCommitScores,
} from "@/lib/db";
import { fetchAllCommits, fetchCommitDiff, fetchRepoMeta } from "@/lib/github";
import { toTimelineNodes } from "@/lib/timeline/from-commits";

async function buildRequest(): Promise<Request> {
  const incoming = await headers();
  const h = new Headers();
  incoming.forEach((value, key) => h.set(key, value));
  return new Request("http://internal/", { headers: h });
}

export default async function RepoTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; name: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { owner, name } = await params;
  const { commit: commitSha } = await searchParams;

  const req = await buildRequest();
  const sessionUser = getSessionUser(req);
  if (!sessionUser) redirect("/signin");

  const token = await getGithubToken(sessionUser.id);
  if (!token) redirect("/connect-github");

  const [meta, commits] = await Promise.all([
    fetchRepoMeta(owner, name, token),
    fetchAllCommits(owner, name, token, 100),
  ]);

  if ("error" in meta) {
    if (meta.status === 404) notFound();
    throw new Error(`GitHub repo fetch failed: ${meta.error}`);
  }
  if ("error" in commits) {
    throw new Error(`GitHub commits fetch failed: ${commits.error}`);
  }

  const nodes = toTimelineNodes(commits, {
    main: meta.default_branch,
    feature: "feature",
  });
  const commitNode = commitSha
    ? nodes.find((n) => n.sha.startsWith(commitSha))
    : undefined;

  const chatRepo: ChatRepo = {
    owner: meta.owner,
    name: meta.name,
    description: meta.description,
    defaultBranch: meta.default_branch,
    language: meta.language,
  };
  const chatCommit: ChatCommit | null = commitNode
    ? {
        sha: commitNode.sha,
        message: commitNode.message,
        author: commitNode.author.name,
        branch: commitNode.branch,
      }
    : null;

  // Saved per-commit chats (private to this user). Load failures degrade to an
  // empty timeline indicator / empty thread rather than breaking the page.
  const repoFullName = `${meta.owner}/${meta.name}`;
  const [chatShas, savedMessages, commitScores] = await Promise.all([
    getCommitsWithChats(sessionUser.id, repoFullName).catch(() => new Set<string>()),
    commitNode
      ? getChatMessages(sessionUser.id, repoFullName, commitNode.sha).catch(() => [])
      : Promise.resolve([]),
    getRepoCommitScores(sessionUser.id, repoFullName).catch(() => []),
  ]);

  const avgPercent =
    commitScores.length > 0
      ? Math.round(
          commitScores.reduce((sum, s) => sum + s.percent, 0) / commitScores.length,
        )
      : null;

  const commitDetail =
    commitNode && (await fetchCommitDiff(meta.owner, meta.name, commitNode.sha, token));
  const renderableDiff =
    commitDetail && !("error" in commitDetail) ? commitDetail : null;

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
              <span className="text-muted-foreground">{meta.owner}/</span>
              <span className="font-semibold text-foreground">{meta.name}</span>
            </h1>
            {meta.description && (
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                {meta.description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                {meta.default_branch}
              </span>
              {meta.language && (
                <span className="flex items-center gap-1.5">
                  {meta.language}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                {meta.private ? "private" : "public"}
              </span>
            </div>
          </div>

          {avgPercent !== null && (
            <div className="rounded-xl border border-vermillion/40 bg-vermillion/5 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-vermillion">
                Avg quiz score
              </p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
                {avgPercent}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                {commitScores.length} commit{commitScores.length === 1 ? "" : "s"} quizzed
              </p>
            </div>
          )}
        </header>

        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-vermillion">
            ◢ Commit timeline
          </p>
          {nodes.length === 0 ? (
            <p className="rounded-xl border border-border bg-card/20 p-6 text-sm text-muted-foreground">
              No commits found for this repository.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card/20 py-2">
              <TimelineGraph
                nodes={nodes}
                owner={meta.owner}
                name={meta.name}
                activeSha={commitNode?.sha}
                chatShas={[...chatShas]}
                scores={Object.fromEntries(
                  commitScores.map((s) => [s.commitSha, s.percent]),
                )}
              />
            </div>
          )}
        </div>
      </main>

      <QuizPanel
        key={commitNode?.sha ?? "general"}
        owner={meta.owner}
        name={meta.name}
        commitSha={commitNode?.sha ?? null}
        mode={chatMode(chatCommit)}
        chat={{
          header: chatHeader(chatRepo, chatCommit),
          commitMessage: commitNode?.message ?? null,
          suggestions: suggestedPrompts(chatCommit),
          initialMessages: savedMessages,
        }}
      />
    </div>
  );
}

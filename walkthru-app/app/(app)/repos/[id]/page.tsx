import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, GitPullRequest } from "lucide-react";
import { TimelineGraph } from "@/components/timeline/timeline-graph";
import { BranchSwitcher } from "@/components/timeline/branch-switcher";
import { ScoreChip } from "@/components/shared/score-chip";
import { ChatPanel } from "@/components/chat/chat-panel";
import { chatHeader, chatMode, suggestedPrompts } from "@/lib/chat/context";
import { getRepoTimelineData } from "@/lib/repo-data";

function UnavailableState({
  title,
  body,
  action,
  href,
}: {
  title: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      <div className="mt-8 rounded-xl border border-border bg-card/30 p-8">
        <h1 className="font-mono text-base font-semibold text-foreground">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        <Link
          href={href}
          className="mt-5 inline-flex rounded-md bg-vermillion px-4 py-2 text-sm font-medium text-hero-ink transition-colors hover:bg-vermillion-deep"
        >
          {action}
        </Link>
      </div>
    </main>
  );
}

export default async function RepoTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commit?: string }>;
}) {
  const { id } = await params;
  const { commit } = await searchParams;
  const state = await getRepoTimelineData(id, commit);

  if (state.status === "not_found") notFound();
  if (state.status === "unauthenticated") {
    return (
      <UnavailableState
        title="No server session found"
        body="This repository page now reads live GitHub data from the server-side session. Sign in through the dev login or Replit auth path, then reconnect GitHub."
        action="Open dev login"
        href="/dev-login"
      />
    );
  }
  if (state.status === "github_disconnected") {
    return (
      <UnavailableState
        title="GitHub is not connected"
        body="Connect GitHub before opening a repository timeline."
        action="Connect GitHub"
        href="/api/auth/github"
      />
    );
  }

  const { repo, branches, nodes, activeNode: commitNode } = state;

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
          {nodes.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card/20 px-2 py-2 sm:px-4">
              <TimelineGraph
                nodes={nodes}
                repoId={repo.id}
                activeSha={commitNode?.sha}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card/20 p-8 text-sm text-muted-foreground">
              No commits were returned for this repository.
            </div>
          )}
        </div>
      </main>

      <ChatPanel
        key={commitNode?.sha ?? "general"}
        repoId={repo.id}
        commitSha={commitNode?.sha ?? null}
        mode={chatMode(commitNode)}
        header={chatHeader(repo, commitNode)}
        commitMessage={commitNode?.message ?? null}
        suggestions={suggestedPrompts(commitNode)}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, GitPullRequest } from "lucide-react";
import { getRepo } from "@/lib/mock/repos";
import { getBranches, getTimeline } from "@/lib/mock/timeline";
import { TimelineGraph } from "@/components/timeline/timeline-graph";
import { BranchSwitcher } from "@/components/timeline/branch-switcher";
import { ScoreChip } from "@/components/shared/score-chip";

export default async function RepoTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepo(id);
  if (!repo) notFound();

  const nodes = getTimeline(id);
  const branches = getBranches(id);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
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
          <TimelineGraph nodes={nodes} />
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { GitBranch, GitPullRequest } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { ScoreChip } from "@/components/shared/score-chip";
import type { MockRepo } from "@/lib/mock/repos";

const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Python: "#3572a5",
  HCL: "#844fba",
};

export function RepoCard({ repo }: { repo: MockRepo }) {
  return (
    <Link
      href={`/repos/${repo.id}`}
      className="group block rounded-xl border border-border bg-card/30 p-5 transition-colors hover:border-zinc-600 hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-sm">
          <span className="text-muted-foreground">{repo.owner}/</span>
          <span className="font-medium text-foreground group-hover:text-vermillion">
            {repo.name}
          </span>
        </p>
        <ScoreChip score={repo.teamScore} />
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {repo.description}
      </p>

      <div className="mt-5 flex items-center gap-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: LANG_COLOR[repo.language] ?? "#a1a1aa" }}
          />
          {repo.language}
        </span>
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          {repo.branchCount}
        </span>
        <span className="flex items-center gap-1.5">
          <GitPullRequest className="h-3.5 w-3.5" />
          {repo.openPrs}
        </span>
        <span className="ml-auto text-zinc-600">
          {relativeTime(repo.lastActivity)}
        </span>
      </div>
    </Link>
  );
}

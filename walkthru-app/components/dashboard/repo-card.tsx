import Link from "next/link";
import { GitBranch, GraduationCap } from "lucide-react";
import { relativeTime } from "@/lib/format";

export type ConnectedRepoCardData = {
  owner: string;
  name: string;
  connectedAt: string;
  lastIndexed: string | null;
  avgScorePercent: number | null;
  quizzedCommits: number;
};

function scoreTone(percent: number): string {
  if (percent >= 80) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (percent >= 50) return "border-vermillion/50 bg-vermillion/10 text-vermillion";
  return "border-destructive/40 bg-destructive/10 text-destructive";
}

export function RepoCard({ repo }: { repo: ConnectedRepoCardData }) {
  return (
    <Link
      href={`/repos/${repo.owner}/${repo.name}`}
      className="group block rounded-xl border border-border bg-card/30 p-5 transition-colors hover:border-zinc-600 hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-sm">
          <span className="text-muted-foreground">{repo.owner}/</span>
          <span className="font-medium text-foreground group-hover:text-vermillion">
            {repo.name}
          </span>
        </p>
        {repo.avgScorePercent !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest tabular-nums ${scoreTone(repo.avgScorePercent)}`}
            aria-label={`Average quiz score ${repo.avgScorePercent}%`}
          >
            <GraduationCap className="h-3 w-3" />
            {repo.avgScorePercent}%
          </span>
        )}
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        Connected {relativeTime(repo.connectedAt)}
        {repo.lastIndexed && (
          <> · indexed {relativeTime(repo.lastIndexed)}</>
        )}
      </p>

      <div className="mt-5 flex items-center gap-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          GitHub
        </span>
        {repo.quizzedCommits > 0 && (
          <span className="text-zinc-500">
            {repo.quizzedCommits} quiz{repo.quizzedCommits === 1 ? "" : "zes"}
          </span>
        )}
        <span className="ml-auto text-zinc-600">
          {relativeTime(repo.connectedAt)}
        </span>
      </div>
    </Link>
  );
}

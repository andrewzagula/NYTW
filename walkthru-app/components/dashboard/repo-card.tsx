import Link from "next/link";
import { GitBranch } from "lucide-react";
import { relativeTime } from "@/lib/format";

export type ConnectedRepoCardData = {
  owner: string;
  name: string;
  connectedAt: string;
  lastIndexed: string | null;
};

export function RepoCard({ repo }: { repo: ConnectedRepoCardData }) {
  return (
    <Link
      href={`/repos/${repo.owner}/${repo.name}`}
      className="group block rounded-xl border border-border bg-card/30 p-5 transition-colors hover:border-zinc-600 hover:bg-card/60"
    >
      <p className="min-w-0 truncate font-mono text-sm">
        <span className="text-muted-foreground">{repo.owner}/</span>
        <span className="font-medium text-foreground group-hover:text-vermillion">
          {repo.name}
        </span>
      </p>

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
        <span className="ml-auto text-zinc-600">
          {relativeTime(repo.connectedAt)}
        </span>
      </div>
    </Link>
  );
}

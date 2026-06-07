import { FileDiff } from "lucide-react";
import type { CommitFile } from "@/lib/github";

type Props = {
  sha: string;
  message: string;
  author: string;
  stats: { additions: number; deletions: number; total: number };
  files: CommitFile[];
};

function lineClass(line: string): string {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "text-emerald-300 bg-emerald-500/5";
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return "text-destructive bg-destructive/5";
  }
  if (line.startsWith("@@")) return "text-vermillion/80";
  if (line.startsWith("+++") || line.startsWith("---")) {
    return "text-muted-foreground";
  }
  return "text-foreground/80";
}

export function CommitDiff({ sha, message, author, stats, files }: Props) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-vermillion">
          ◢ Diff for {sha.slice(0, 7)}
        </p>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          <span className="text-emerald-300">+{stats.additions}</span>{" "}
          <span className="text-destructive">−{stats.deletions}</span>
          {" · "}
          {files.length} file{files.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/20">
        <header className="border-b border-border px-4 py-3">
          <p className="font-mono text-sm text-foreground">{message}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {author}
          </p>
        </header>

        {files.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No file changes available for this commit.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {files.map((f) => (
              <li key={f.filename}>
                <div className="flex items-center justify-between gap-3 bg-card/30 px-4 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileDiff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <code className="truncate font-mono text-xs text-foreground">
                      {f.filename}
                    </code>
                    <span className="rounded border border-border bg-card/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {f.status}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    <span className="text-emerald-300">+{f.additions}</span>{" "}
                    <span className="text-destructive">−{f.deletions}</span>
                  </span>
                </div>
                {f.patch ? (
                  <pre className="overflow-x-auto px-4 py-2 font-mono text-[11px] leading-relaxed">
                    {f.patch.split("\n").map((line, i) => (
                      <span key={i} className={`block ${lineClass(line)}`}>
                        {line || " "}
                      </span>
                    ))}
                  </pre>
                ) : (
                  <p className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                    (binary or empty patch)
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

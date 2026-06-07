import { Check } from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";

const READS = [
  "Repositories you choose to connect",
  "Branches and their divergence points",
  "Pull requests with diffs and review comments",
  "Commits — message, diff, author, timestamp",
];

export default function ConnectGithubPage() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-7 shadow-2xl shadow-black/40">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background">
        <GithubIcon className="h-5 w-5" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
        Connect GitHub
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Walkthru pulls your history so the timeline and AI layer have real
        context. We only read what you connect.
      </p>

      <ul className="mt-6 space-y-2.5">
        {READS.map((r) => (
          <li key={r} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-score-high" />
            {r}
          </li>
        ))}
      </ul>

      <a
        href="/api/auth/github"
        className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-md bg-vermillion px-4 py-2.5 text-sm font-medium text-hero-ink transition-colors hover:bg-vermillion-deep"
      >
        <GithubIcon className="h-4 w-4" />
        Connect GitHub
      </a>
    </div>
  );
}

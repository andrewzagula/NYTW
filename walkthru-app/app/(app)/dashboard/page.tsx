import Link from "next/link";
import { RepoCard } from "@/components/dashboard/repo-card";
import { CornerBracket } from "@/components/shared/corner-bracket";
import { scoreClasses, scoreTier } from "@/lib/format";
import { getConnectedRepoCards } from "@/lib/repo-data";

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <CornerBracket color="border-vermillion/50" className="px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </p>
    </CornerBracket>
  );
}

function EmptyState({
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
    <div className="mt-10 rounded-xl border border-border bg-card/30 p-8">
      <h2 className="font-mono text-base font-semibold text-foreground">
        {title}
      </h2>
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
  );
}

export default async function DashboardPage() {
  const state = await getConnectedRepoCards();
  const repos = state.status === "ready" ? state.repos : [];
  const avgScore = Math.round(
    repos.length
      ? repos.reduce((sum, r) => sum + r.teamScore, 0) / repos.length
      : 0,
  );
  const openPrs = repos.reduce((sum, r) => sum + r.openPrs, 0);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-vermillion">
            ◢ Dashboard
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight">
            Your repositories
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {repos.length} connected repositories
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Repos" value={String(repos.length)} />
          <Stat
            label="Avg score"
            value={String(avgScore)}
            accent={scoreClasses[scoreTier(avgScore)].text}
          />
          <Stat label="Open PRs" value={String(openPrs)} />
        </div>
      </div>

      {state.status === "unauthenticated" && (
        <EmptyState
          title="No server session found"
          body="The dashboard reads connected repos from the server-side GitHub session. Sign in through the dev login or Replit auth path, then connect GitHub."
          action="Open dev login"
          href="/dev-login"
        />
      )}

      {state.status === "github_disconnected" && (
        <EmptyState
          title="GitHub is not connected"
          body="Connect GitHub through the OAuth route so Walkthru can load the repositories saved for this account."
          action="Connect GitHub"
          href="/api/auth/github"
        />
      )}

      {state.status === "ready" && repos.length === 0 && (
        <EmptyState
          title="No connected repositories yet"
          body="Use the repo selection flow to save repositories to this account. Once saved, they will appear here with live GitHub metadata."
          action="Open repo test page"
          href="/test"
        />
      )}

      {repos.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </main>
  );
}

import { repos } from "@/lib/mock/repos";
import { RepoCard } from "@/components/dashboard/repo-card";
import { CornerBracket } from "@/components/shared/corner-bracket";
import { scoreClasses, scoreTier } from "@/lib/format";

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

export default function DashboardPage() {
  const avgScore = Math.round(
    repos.reduce((sum, r) => sum + r.teamScore, 0) / repos.length,
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
            {repos.length} connected repositories · northwind
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

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {repos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
    </main>
  );
}

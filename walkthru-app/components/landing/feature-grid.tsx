import { GitBranch, LineChart, MessagesSquare, ShieldCheck } from "lucide-react";
import { CornerBracket } from "@/components/shared/corner-bracket";

const FEATURES = [
  {
    no: "01",
    kicker: "Visual timeline",
    title: "Git history a human can read",
    body: "Branches as lanes, merges as real nodes, every commit color-coded by comprehension score. Like git log --graph, redesigned for people.",
    Icon: GitBranch,
  },
  {
    no: "02",
    kicker: "AI Q&A",
    title: "Answers grounded in the diff",
    body: "Ask anything about a commit, PR, or branch. Claude answers with the actual diff and surrounding code injected — then caches it for the team.",
    Icon: MessagesSquare,
  },
  {
    no: "03",
    kicker: "The gate",
    title: "Comprehension before commit",
    body: "The CLI asks one question generated from your staged diff, grades it, and lets the commit through on a pass. Skips lockfiles and tiny changes.",
    Icon: ShieldCheck,
  },
  {
    no: "04",
    kicker: "Scores as coaching",
    title: "Trends, not performance reviews",
    body: "Per-developer and per-repo comprehension over time. Designed to surface gaps and improvement, never to rank people publicly.",
    Icon: LineChart,
  },
];

export function FeatureGrid() {
  return (
    <section className="relative bg-background">
      <div className="bg-grid-dark">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermillion">
            ◢ What you get
          </p>
          <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Two surfaces, one comprehension layer.
          </h2>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ no, kicker, title, body, Icon }) => (
              <CornerBracket key={no} color="border-vermillion/60">
                <div className="h-full rounded-lg bg-card/30 p-7 transition-colors hover:bg-card/60">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-vermillion">
                      {no} · {kicker}
                    </span>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-bold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </CornerBracket>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

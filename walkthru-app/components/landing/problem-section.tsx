import { GitGraphMotif } from "@/components/shared/git-graph-motif";

const POINTS = [
  {
    kicker: "Commit noise",
    title: "Messages say what, never why",
    body: "“fix bug”, “update”, “wip”. The reasoning behind a change almost never makes it into the log.",
  },
  {
    kicker: "Context evaporates",
    title: "PRs close and the thread dies",
    body: "A week later someone asks “why does this work?” and the answer left with the tab that got closed.",
  },
  {
    kicker: "Onboarding",
    title: "A repo and a prayer",
    body: "New engineers are pointed at thousands of commits and expected to reconstruct intent that was never written down.",
  },
  {
    kicker: "No comprehension check",
    title: "Review catches bugs, not understanding",
    body: "Nobody verifies the author actually understood what they shipped — until it breaks in production.",
  },
];

export function ProblemSection() {
  return (
    <section className="relative bg-background">
      <div className="bg-grid-dark">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermillion">
            ✕ The problem
          </p>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Your git history is the most complete record of what you built. It’s
            also almost unreadable.
          </h2>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {POINTS.map((p) => (
              <div key={p.kicker} className="bg-background p-7">
                <p className="font-mono text-[11px] uppercase tracking-widest text-vermillion">
                  {p.kicker}
                </p>
                <h3 className="mt-3 text-lg font-medium text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 overflow-hidden rounded-xl border border-border bg-card/40 px-6 py-10">
            <GitGraphMotif className="mx-auto max-w-3xl opacity-90" />
          </div>
        </div>
      </div>
    </section>
  );
}

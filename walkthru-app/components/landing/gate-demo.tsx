import { Terminal } from "@/components/shared/terminal";

export function GateDemo() {
  return (
    <section className="relative bg-background">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermillion">
            ◢ The gate
          </p>
          <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            Prove you get it, before it ships.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            The Walkthru CLI hooks <code className="font-mono text-foreground">git commit</code>.
            It reads your staged diff, asks one question that requires actually
            understanding the change, grades your answer, and lets the commit
            through when you pass. The score syncs to the web app automatically.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "Questions are generated from the real diff — not templates",
              "Graded on accuracy, depth, and awareness",
              "Lockfiles, docs, and tiny diffs skip the gate",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vermillion" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Terminal title="checkout-service — git commit">
          <div className="space-y-1 text-muted-foreground">
            <p>
              <span className="text-vermillion">◢ walkthru</span> — comprehension
              gate
            </p>
            <p className="text-zinc-500">
              Staged: 47 lines across 3 files
            </p>
          </div>

          <div className="mt-5">
            <p className="text-zinc-500">
              <span className="text-vermillion">Q</span>{" "}
              <span className="text-foreground">
                You replaced the TTL cache with LRU eviction here. When would the
                old approach have returned stale data that this avoids?
              </span>
            </p>
          </div>

          <div className="mt-4 text-foreground">
            <p>
              <span className="text-vermillion">A</span> LRU evicts by recency, so
              a hot key never expires mid-use the way a fixed TTL could — the
              stale window between expiry and refetch is gone.
              <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-vermillion" />
            </p>
          </div>

          <div className="mt-5 border-t border-border/60 pt-4">
            <p>
              <span className="text-zinc-500">Score:</span>{" "}
              <span className="font-semibold text-score-high">82/100</span>
            </p>
            <p className="mt-1 text-zinc-500">
              Good grasp of the eviction tradeoff. Could note the cold-start case.
            </p>
            <p className="mt-3 text-score-high">✓ Commit proceeding…</p>
          </div>
        </Terminal>
      </div>
    </section>
  );
}

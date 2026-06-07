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
            The Walkthru CLI hooks into commit and push events. It registers the
            final commit SHA with the API, prints a quiz URL, and lets the web
            app handle the comprehension check.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {[
              "Questions are generated from the real diff — not templates",
              "Quiz links are tied to the final commit SHA",
              "Push retries catch commits that were not registered locally",
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
              <span className="text-vermillion">$</span> git commit -m &quot;feat:
              add cache eviction&quot;
            </p>
            <p className="text-zinc-500">
              [main 4f3a8c2] feat: add cache eviction
            </p>
          </div>

          <div className="mt-5">
            <p className="text-zinc-500">
              <span className="text-vermillion">walkthru</span>{" "}
              <span className="text-foreground">
                registered commit 4f3a8c2
              </span>
            </p>
          </div>

          <div className="mt-5 border-t border-border/60 pt-4">
            <p>
              <span className="text-zinc-500">Quiz:</span>{" "}
              <span className="font-semibold text-score-high">https://walkthru.dev/q/4f3a8c2</span>
            </p>
            <p className="mt-1 text-zinc-500">
              Open the link to answer the generated question in Walkthru.
            </p>
            <p className="mt-3 text-score-high">✓ Git flow continues</p>
          </div>
        </Terminal>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-vermillion text-hero-ink">
      <div className="absolute inset-0 bg-grid-hero opacity-60" />
      <div className="pointer-events-none absolute -right-24 top-1/2 hidden -translate-y-1/2 select-none text-[22rem] font-black leading-none text-hero-ink/[0.06] md:block">
        ◢
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-36 sm:px-8 sm:pb-28 sm:pt-44">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.22em] text-hero-ink/70">
          ◢ Comprehension-gated commits
        </p>

        <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Ship code your team actually understands.
        </h1>

        <p className="mt-7 max-w-xl text-lg leading-relaxed text-hero-ink/80">
          Walkthru turns your git history into something readable — every branch,
          PR, and commit — then stops each commit at the gate to make sure the
          person who wrote it can explain it.
        </p>

        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            href="/signin"
            className="group inline-flex items-center gap-2 rounded-md bg-hero-ink px-6 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-black"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <div className="inline-flex items-center gap-3 rounded-md border border-hero-ink/20 bg-hero-ink/[0.04] px-4 py-3">
            <code className="font-mono text-sm text-hero-ink">
              <span className="text-hero-ink/50">$</span> npm i -g @walkthru/cli
            </code>
            <CopyButton
              text="npm i -g @walkthru/cli"
              className="text-hero-ink/70 hover:text-hero-ink"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

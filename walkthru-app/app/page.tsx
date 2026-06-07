import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { GateDemo } from "@/components/landing/gate-demo";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { SiteFooter } from "@/components/landing/site-footer";
import { Ticker } from "@/components/shared/ticker";

const TICKER_ITEMS = [
  "Comprehension gate",
  "Visual timeline",
  "AI Q&A",
  "Grounded in your diffs",
  "Scores as coaching",
  "GitHub native",
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader overHero />
      <main>
        <Hero />
        <Ticker items={TICKER_ITEMS} />
        <ProblemSection />
        <GateDemo />
        <FeatureGrid />

        {/* Closing CTA */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-black leading-[1.02] tracking-tight text-balance sm:text-6xl">
              Stop shipping code nobody understands.
            </h2>
            <p className="mx-auto mt-6 max-w-md text-base text-muted-foreground">
              Connect a repo, install the CLI, and watch comprehension become
              something you can actually see.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signin"
                className="group inline-flex items-center gap-2 rounded-md bg-vermillion px-6 py-3 text-sm font-medium text-hero-ink transition-colors hover:bg-vermillion-deep"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-zinc-600"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

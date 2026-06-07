import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { DocsSidebar, type DocSection } from "@/components/docs/docs-sidebar";
import { CodeBlock } from "@/components/shared/code-block";

export const metadata: Metadata = {
  title: "Docs — Walkthru CLI",
  description:
    "Install the Walkthru CLI, install the commit-msg hook, and configure the comprehension gate.",
};

const SECTIONS: DocSection[] = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Install" },
  { id: "login", label: "walkthru login" },
  { id: "init", label: "walkthru init" },
  { id: "config", label: "Configuration" },
  { id: "question-types", label: "Question types" },
  { id: "grading", label: "Grading rubric" },
  { id: "gate", label: "The gate flow" },
];

const CONFIG_JSON = `{
  "threshold": 70,
  "allowOverride": true,
  "overrideRequiresNote": true,
  "questionTypes": ["explain", "impact", "risk"],
  "exemptPaths": ["*.md", "*.lock", "generated/**"],
  "minDiffLines": 10
}`;

function Heading({ id, eyebrow, children }: { id: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="scroll-mt-24" id={id}>
      <p className="font-mono text-[11px] uppercase tracking-widest text-vermillion">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
        {children}
      </h2>
    </div>
  );
}

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 pb-24 pt-28 sm:px-8 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 self-start">
            <DocsSidebar sections={SECTIONS} />
          </div>
        </aside>

        <main className="min-w-0 max-w-3xl space-y-16">
          <header>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Walkthru CLI
            </p>
            <h1 className="mt-3 font-display text-5xl font-black leading-[1.0] tracking-tight">
              The comprehension gate, in your terminal.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              The Walkthru CLI installs a <code className="font-mono text-foreground">commit-msg</code> hook
              that reads your staged diff, asks one question about it, grades your
              answer, and lets the commit through when you pass.
            </p>
          </header>

          <section className="space-y-4">
            <Heading id="overview" eyebrow="01 · Overview">
              What Walkthru does
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Walkthru has two surfaces over one data model. The{" "}
              <strong className="font-medium text-foreground">web app</strong>{" "}
              visualizes your git history and answers questions about it. The{" "}
              <strong className="font-medium text-foreground">CLI</strong>{" "}
              intercepts <code className="font-mono text-foreground">git commit</code> and
              runs the comprehension gate before code is written. Scores from the
              CLI sync to the web app automatically.
            </p>
          </section>

          <section className="space-y-4">
            <Heading id="install" eyebrow="02 · Install">
              Install the CLI
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Install globally from npm. Requires Node 20.9+.
            </p>
            <CodeBlock label="bash" code="npm install -g @walkthru/cli" />
          </section>

          <section className="space-y-4">
            <Heading id="login" eyebrow="03 · Authenticate">
              walkthru login
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Opens your browser for GitHub OAuth and stores the token locally so
              the CLI can sync scores to your Walkthru account.
            </p>
            <CodeBlock label="bash" code="walkthru login" />
          </section>

          <section className="space-y-4">
            <Heading id="init" eyebrow="04 · Set up a repo">
              walkthru init
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Run inside a repository. Installs the hook into{" "}
              <code className="font-mono text-foreground">.git/hooks/commit-msg</code>{" "}
              and writes a <code className="font-mono text-foreground">.walkthru.json</code>{" "}
              config. Commit that file so your team shares the same gate.
            </p>
            <CodeBlock label="bash" code={"cd your-repo\nwalkthru init"} />
          </section>

          <section className="space-y-4">
            <Heading id="config" eyebrow="05 · Configuration">
              .walkthru.json
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Lives at the repo root and controls the gate&apos;s behavior.
            </p>
            <CodeBlock label=".walkthru.json" code={CONFIG_JSON} />
            <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <li><code className="font-mono text-foreground">threshold</code> — minimum score to pass (0–100).</li>
              <li><code className="font-mono text-foreground">allowOverride</code> — whether <code className="font-mono text-foreground">--skip</code> is permitted; always logged.</li>
              <li><code className="font-mono text-foreground">overrideRequiresNote</code> — forces a reason when skipping.</li>
              <li><code className="font-mono text-foreground">questionTypes</code> — which kinds of questions to ask.</li>
              <li><code className="font-mono text-foreground">exemptPaths</code> — globs that skip the gate (docs, lockfiles, generated code).</li>
              <li><code className="font-mono text-foreground">minDiffLines</code> — diffs smaller than this skip entirely.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading id="question-types" eyebrow="06 · Question types">
              explain · impact · risk
            </Heading>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { k: "explain", d: "Summarize what this change does in your own words." },
                { k: "impact", d: "What behavior changes for users or callers of this code?" },
                { k: "risk", d: "What could go wrong, and how would you detect it?" },
              ].map((q) => (
                <div key={q.k} className="rounded-lg border border-border bg-card/30 p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-vermillion">{q.k}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{q.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <Heading id="grading" eyebrow="07 · Grading">
              How answers are scored
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Claude grades on three dimensions, weighted equally. A 100 would
              satisfy a skeptical senior engineer in review; a 0 shows no
              understanding.
            </p>
            <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <li><strong className="font-medium text-foreground">Accuracy</strong> — is the answer factually correct about what the code does?</li>
              <li><strong className="font-medium text-foreground">Depth</strong> — does it show understanding of <em>why</em>, not just <em>what</em>?</li>
              <li><strong className="font-medium text-foreground">Awareness</strong> — does it acknowledge risks, edge cases, or downstream effects?</li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading id="gate" eyebrow="08 · The flow">
              What a gated commit looks like
            </Heading>
            <CodeBlock
              label="commit-msg"
              code={`◢ walkthru — comprehension gate
Staged: 47 lines across 3 files

Q: You replaced the forEach loop with a reduce here. What advantage
   does this give you, and is there a case where it behaves differently?

A: _

Score: 82/100
"Good explanation of the immutability benefit. Could have mentioned
 the empty-array edge case with the initial accumulator."

✓ Commit proceeding…`}
            />
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

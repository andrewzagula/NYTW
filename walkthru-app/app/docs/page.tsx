import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { DocsSidebar, type DocSection } from "@/components/docs/docs-sidebar";
import { CodeBlock } from "@/components/shared/code-block";

export const metadata: Metadata = {
  title: "Docs — Walkthru CLI",
  description:
    "Install the Walkthru CLI, install git hooks, and register commits with Walkthru.",
};

const SECTIONS: DocSection[] = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Install" },
  { id: "login", label: "walkthru login" },
  { id: "init", label: "walkthru init" },
  { id: "config", label: "Configuration" },
  { id: "hook-flow", label: "Hook flow" },
];

const CONFIG_JSON = `{
  "includeDiff": true,
  "maxDiffBytes": 120000
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
              Commit registration, wired into git.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              The Walkthru CLI installs git hooks that register commits with the
              API and print the quiz URL returned by the web app.
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
              registers commit metadata after commits are created and retries
              unregistered outgoing commits before push.
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
              Stores the token locally so the CLI can register commits with your
              Walkthru account.
            </p>
            <CodeBlock label="bash" code="walkthru login" />
          </section>

          <section className="space-y-4">
            <Heading id="init" eyebrow="04 · Set up a repo">
              walkthru init
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Run inside a repository. Installs hooks into{" "}
              <code className="font-mono text-foreground">.git/hooks/post-commit</code>{" "}
              and <code className="font-mono text-foreground">.git/hooks/pre-push</code>{" "}
              and writes a <code className="font-mono text-foreground">.walkthru.json</code>{" "}
              config.
            </p>
            <CodeBlock label="bash" code={"cd your-repo\nwalkthru init"} />
          </section>

          <section className="space-y-4">
            <Heading id="config" eyebrow="05 · Configuration">
              .walkthru.json
            </Heading>
            <p className="leading-relaxed text-muted-foreground">
              Lives at the repo root and controls hook registration behavior.
            </p>
            <CodeBlock label=".walkthru.json" code={CONFIG_JSON} />
            <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <li><code className="font-mono text-foreground">includeDiff</code> — include the commit patch in the registration payload.</li>
              <li><code className="font-mono text-foreground">maxDiffBytes</code> — truncate large diffs before sending them to the API.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading id="hook-flow" eyebrow="06 · Hook flow">
              What registration looks like
            </Heading>
            <CodeBlock
              label="post-commit"
              code={`$ git commit -m "feat: add retry policy"
[main 4f3a8c2] feat: add retry policy

Walkthru quiz for 4f3a8c2: https://walkthru.dev/...`}
            />
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

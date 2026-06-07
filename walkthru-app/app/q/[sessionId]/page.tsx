import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Code2, GitCommitHorizontal } from "lucide-react";
import { getSession } from "@/lib/db";

export default async function QuizSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) notFound();

  const commitLabel = session.commit_sha ?? session.commit_id ?? session.id;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-5 border-b border-border pb-8">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-vermillion"
          >
            Walkthru
          </Link>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitCommitHorizontal className="h-4 w-4 text-vermillion" />
              <span className="font-mono">{commitLabel}</span>
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Commit comprehension quiz
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {session.commit_message ?? session.commit_description ?? "Generated quiz session"}
            </p>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Repository
              </dt>
              <dd className="mt-1 text-foreground">{session.repo}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Branch
              </dt>
              <dd className="mt-1 text-foreground">{session.branch ?? "unknown"}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Source
              </dt>
              <dd className="mt-1 text-foreground">{session.source ?? "unknown"}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Started
              </dt>
              <dd className="mt-1 text-foreground">
                {new Date(session.started_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </header>

        {session.commit_description && (
          <section className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Commit Description
            </h2>
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-card/30 p-4 text-sm leading-6 text-foreground">
              {session.commit_description}
            </p>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Questions
            </h2>
            <span className="text-sm text-muted-foreground">
              {session.questions.length} generated
            </span>
          </div>

          {session.questions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/30 p-4 text-sm text-muted-foreground">
              No generated questions were stored for this session.
            </div>
          ) : (
            <ol className="space-y-4">
              {session.questions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-lg border border-border bg-card/30 p-5"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-vermillion font-mono text-xs font-semibold text-hero-ink">
                      {q.question_order}
                    </span>
                    <p className="text-base font-medium leading-6 text-foreground">
                      {q.question}
                    </p>
                  </div>

                  <div className="space-y-4 pl-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-score-high">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Expected Answer
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {q.expected_answer}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Why It Matters
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {q.explanation}
                      </p>
                    </div>

                    {q.context_summary && (
                      <div className="space-y-1">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Context
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {q.context_summary}
                        </p>
                      </div>
                    )}

                    {q.snippets.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          <Code2 className="h-3.5 w-3.5" />
                          Relevant Snippets
                        </div>
                        {q.snippets.map((snippet, index) => (
                          <pre
                            key={`${snippet.path}-${index}`}
                            className="overflow-x-auto rounded-md border border-border bg-background p-3 text-xs leading-5 text-foreground"
                          >
                            <code>{`${snippet.path}${
                              snippet.lineStart ? `:${snippet.lineStart}` : ""
                            }\n${snippet.snippet}`}</code>
                          </pre>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

import { GithubIcon } from "@/components/shared/github-icon";

export default function SignInPage() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-7 shadow-2xl shadow-black/40">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Welcome to Walkthru
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Sign in with GitHub to connect your repos and see your comprehension
        dashboard.
      </p>

      <a
        href="/api/auth/github"
        className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-md bg-vermillion px-4 py-2.5 text-sm font-medium text-hero-ink transition-colors hover:bg-vermillion-deep"
      >
        <GithubIcon className="h-4 w-4" />
        Continue with GitHub
      </a>

      <p className="mt-4 text-center font-mono text-[11px] text-zinc-600">
        Walkthru only reads what you connect.
      </p>
    </div>
  );
}

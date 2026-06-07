"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth, type AuthProvider } from "@/lib/auth";
import { GithubIcon } from "@/components/shared/github-icon";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5 0-.7-.1-1.4-.2-2z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 .9-3.3.9-2.6 0-4.7-1.7-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.5 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8z" />
      <path fill="#4285F4" d="M12 6.4c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.6l3.4 2.6C7.3 8.1 9.4 6.4 12 6.4z" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<AuthProvider | null>(null);

  function go(provider: AuthProvider) {
    if (pending) return;
    if (provider === "email" && !email.trim()) return;
    setPending(provider);
    const user = signIn(provider, email);
    router.push(user.githubConnected ? "/dashboard" : "/connect-github");
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-7 shadow-2xl shadow-black/40">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Sign in to your comprehension dashboard."
          : "Start gating commits in minutes."}
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => go("github")}
          disabled={!!pending}
          className="flex w-full items-center justify-center gap-2.5 rounded-md bg-vermillion px-4 py-2.5 text-sm font-medium text-hero-ink transition-colors hover:bg-vermillion-deep disabled:opacity-60"
        >
          {pending === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GithubIcon className="h-4 w-4" />
          )}
          Continue with GitHub
        </button>
        <p className="text-center font-mono text-[11px] text-zinc-600">
          connects your repos in one step
        </p>

        <button
          type="button"
          onClick={() => go("google")}
          disabled={!!pending}
          className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {pending === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Continue with Google
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go("email");
        }}
        className="space-y-3"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-vermillion focus:ring-2 focus:ring-vermillion/30"
        />
        <button
          type="submit"
          disabled={!!pending}
          className={cn(
            "w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60",
          )}
        >
          {pending === "email" ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            "Continue with email"
          )}
        </button>
        <p className="text-center font-mono text-[11px] text-zinc-600">
          you&apos;ll connect GitHub next
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New to Walkthru?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-vermillion transition-colors hover:text-vermillion-deep"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

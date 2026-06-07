"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { RepoCard, type ConnectedRepoCardData } from "@/components/dashboard/repo-card";
import { relativeTime } from "@/lib/format";

type ApiConnectedRepo = {
  full_name: string;
  connected_at: string;
  last_indexed: string | null;
  index_job_id: string | null;
};

type ApiGithubRepo = {
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
  description: string | null;
};

function splitFullName(fullName: string): { owner: string; name: string } {
  const slash = fullName.indexOf("/");
  return { owner: fullName.slice(0, slash), name: fullName.slice(slash + 1) };
}

function toCardData(r: ApiConnectedRepo): ConnectedRepoCardData {
  const { owner, name } = splitFullName(r.full_name);
  return {
    owner,
    name,
    connectedAt: r.connected_at,
    lastIndexed: r.last_indexed,
  };
}

export default function DashboardPage() {
  const [connected, setConnected] = useState<ApiConnectedRepo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [ghRepos, setGhRepos] = useState<ApiGithubRepo[] | null>(null);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const r = await fetch("/api/user/profile", { cache: "no-store" });
      if (!r.ok) {
        setError(`Failed to load repos (${r.status})`);
        setConnected([]);
        return;
      }
      const data = (await r.json()) as { repos: ApiConnectedRepo[] };
      setConnected(data.repos ?? []);
    } catch {
      setError("Network error loading repos.");
      setConnected([]);
    }
  }, []);

  useEffect(() => {
    // Mount-time fetch — setState happens inside loadProfile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  const loadGithubRepos = useCallback(async () => {
    setGhLoading(true);
    setGhError(null);
    try {
      const r = await fetch("/api/repos", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) {
        setGhError((data?.error as string) ?? `Failed (${r.status})`);
        return;
      }
      setGhRepos(data.repos as ApiGithubRepo[]);
    } catch {
      setGhError("Network error");
    } finally {
      setGhLoading(false);
    }
  }, []);

  function togglePicker() {
    setShowPicker((s) => {
      const next = !s;
      if (next && !ghRepos && !ghLoading) void loadGithubRepos();
      return next;
    });
  }

  async function connect(fullName: string) {
    const { owner, name } = splitFullName(fullName);
    setConnecting(fullName);
    try {
      await fetch("/api/repos/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, name }),
      });
      await loadProfile();
    } finally {
      setConnecting(null);
    }
  }

  const connectedCount = connected?.length ?? 0;
  const connectedFullNames = new Set(connected?.map((r) => r.full_name) ?? []);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-vermillion">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight">
            Your repositories
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {connected === null
              ? "Loading…"
              : `${connectedCount} connected ${connectedCount === 1 ? "repository" : "repositories"}`}
          </p>
        </div>

        <div className="min-w-24 text-right">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Repos
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
            {connected === null ? "—" : String(connectedCount)}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {connected !== null && connected.length === 0 && !showPicker && (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/20 p-8 text-center">
          <p className="font-display text-lg font-semibold">
            Nothing connected yet
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Connect a GitHub repo to see its timeline and chat about its commits.
          </p>
          <button
            type="button"
            onClick={togglePicker}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-vermillion px-4 py-2 text-sm font-medium text-hero-ink transition-colors hover:bg-vermillion-deep"
          >
            <Plus className="h-4 w-4" />
            Connect a repo
          </button>
        </div>
      )}

      {connected !== null && connected.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {connected.map((r) => (
            <RepoCard key={r.full_name} repo={toCardData(r)} />
          ))}
          <button
            type="button"
            onClick={togglePicker}
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/10 p-5 text-sm font-medium text-muted-foreground transition-colors hover:border-vermillion/50 hover:bg-card/30 hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            Connect another repo
          </button>
        </div>
      )}

      {showPicker && (
        <section className="mt-8 rounded-xl border border-border bg-card/30 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-widest text-vermillion">
              ◢ Your GitHub repositories
            </p>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              aria-label="Close repo picker"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {ghLoading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading repositories…
            </div>
          )}
          {ghError && (
            <p className="mt-4 text-sm text-destructive">{ghError}</p>
          )}
          {ghRepos && (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {ghRepos.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground">
                  No repositories found on your GitHub account.
                </li>
              )}
              {ghRepos.map((r) => {
                const isConnected = connectedFullNames.has(r.full_name);
                const busy = connecting === r.full_name;
                return (
                  <li
                    key={r.full_name}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm">
                        {r.full_name}
                      </p>
                      {r.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.private ? "private" : "public"}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-600">
                      {relativeTime(r.updated_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => connect(r.full_name)}
                      disabled={isConnected || busy}
                      className={`min-w-[88px] rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                        isConnected
                          ? "cursor-default border-border text-muted-foreground"
                          : "border-vermillion bg-vermillion text-hero-ink hover:bg-vermillion-deep disabled:opacity-60"
                      }`}
                    >
                      {isConnected
                        ? "Connected"
                        : busy
                          ? "Connecting…"
                          : "Connect"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

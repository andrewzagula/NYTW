"use client";

import { useState, useEffect } from "react";

interface AuthStatus {
  replit_authed: boolean;
  github_connected: boolean;
  username: string | null;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface Repo {
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
  description: string | null;
}

export default function TestPage() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [commitTotal, setCommitTotal] = useState<number | null>(null);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data: AuthStatus) => setStatus(data))
      .catch(() => setStatus({ replit_authed: false, github_connected: false, username: null }));
  }, []);

  async function fetchCommits() {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    setCommits(null);
    try {
      const r = await fetch(
        `/api/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Request failed");
      } else {
        setCommits(data.commits as Commit[]);
        setCommitTotal(data.total as number);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function fetchRepos() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/repos");
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Request failed");
      } else {
        setRepos(data.repos as Repo[]);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function selectRepo(fullName: string) {
    const slash = fullName.indexOf("/");
    setOwner(fullName.slice(0, slash));
    setRepo(fullName.slice(slash + 1));
    setCommits(null);
    setCommitTotal(null);
  }

  if (!status) {
    return <div className="p-6 font-mono text-sm">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-3xl font-mono text-sm space-y-6">
      <h1 className="text-base font-bold">Walkthru — GitHub OAuth Test</h1>

      {/* Auth status */}
      <div className="p-3 border border-gray-200 rounded space-y-2">
        {!status.replit_authed ? (
          <p className="text-gray-600">Sign in via Replit to continue</p>
        ) : !status.github_connected ? (
          <>
            <p>Signed in as <strong>{status.username}</strong></p>
            <a
              href="/api/auth/github"
              className="inline-block px-3 py-1 bg-gray-900 text-white rounded text-xs hover:bg-gray-700"
            >
              Connect GitHub
            </a>
          </>
        ) : (
          <p>
            Signed in as <strong>{status.username}</strong> · GitHub connected
          </p>
        )}
      </div>

      {status.github_connected && (
        <>
          {/* Repos */}
          <div className="space-y-2">
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
            >
              My Repos
            </button>
            {repos && (
              <ul className="border border-gray-200 rounded divide-y divide-gray-100">
                {repos.map((r) => (
                  <li
                    key={r.full_name}
                    onClick={() => selectRepo(r.full_name)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                  >
                    <span>{r.full_name}</span>
                    <span className="text-gray-400 text-xs">
                      {r.private ? "private" : "public"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Commit fetch */}
          <div className="space-y-2">
            <div className="flex gap-2 items-center flex-wrap">
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="owner"
                className="border border-gray-300 rounded px-2 py-1 text-xs w-32"
              />
              <span className="text-gray-400">/</span>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repo"
                className="border border-gray-300 rounded px-2 py-1 text-xs w-48"
              />
              <button
                onClick={fetchCommits}
                disabled={loading || !owner || !repo}
                className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Fetch Commits"}
              </button>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            {commits !== null && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">{commitTotal} commits</p>
                <ul className="border border-gray-200 rounded divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {commits.map((c) => (
                    <li key={c.sha} className="px-3 py-1.5 text-xs flex gap-2 items-baseline">
                      <span className="text-gray-400 shrink-0">[{c.sha.slice(0, 7)}]</span>
                      <span className="text-gray-500 shrink-0">{c.date.slice(0, 10)}</span>
                      <span className="text-gray-600 shrink-0">{c.author}</span>
                      <span className="truncate">{c.message.split("\n")[0]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

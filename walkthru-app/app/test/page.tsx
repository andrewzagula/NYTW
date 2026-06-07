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

interface CommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

interface CommitDetail {
  sha: string;
  message: string;
  author: string;
  date: string;
  stats: { additions: number; deletions: number; total: number };
  files: CommitFile[];
}

interface UserProfile {
  github_username: string;
  github_avatar: string;
  created_at: string;
  last_active: string;
}

interface ConnectedRepo {
  full_name: string;
  connected_at: string;
  last_indexed: string | null;
  index_job_id: string | null;
}

interface SessionAttempt {
  question: string;
  correct: boolean;
  hint?: string;
  created_at: string;
}

interface GameSession {
  id: string;
  user_id: string;
  repo: string;
  started_at: string;
  score: number;
  total: number;
  attempts: SessionAttempt[];
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
  const [openSha, setOpenSha] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<Record<string, CommitDetail | { error: string }>>({});
  const [diffLoading, setDiffLoading] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data: AuthStatus) => {
        setStatus(data);
        if (data.github_connected) {
          fetch("/api/user/profile")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) {
                setUserProfile(d.user ?? null);
                setConnectedRepos(d.repos ?? []);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setStatus({ replit_authed: false, github_connected: false, username: null }));

    const stored = localStorage.getItem("walkthru_session_id");
    if (stored) {
      fetch(`/api/sessions?sessionId=${encodeURIComponent(stored)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setCurrentSession(d as GameSession); })
        .catch(() => {});
    }
  }, []);

  async function fetchCommits() {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    setCommits(null);
    setOpenSha(null);
    setDiffs({});
    try {
      const r = await fetch(
        `/api/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Request failed");
        setLoading(false);
        return;
      }
      setCommits(data.commits as Commit[]);
      setCommitTotal(data.total as number);
    } catch {
      setError("Network error");
      setLoading(false);
      return;
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
    setOpenSha(null);
    setDiffs({});
  }

  async function connectRepo(fullName: string) {
    const slash = fullName.indexOf("/");
    const owner = fullName.slice(0, slash);
    const name = fullName.slice(slash + 1);
    await fetch("/api/repos/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, name }),
    });
    const d = await fetch("/api/user/profile").then((r) => (r.ok ? r.json() : null));
    if (d) {
      setUserProfile(d.user ?? null);
      setConnectedRepos(d.repos ?? []);
    }
  }

  async function startSession(repo: string) {
    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo }),
    });
    if (!r.ok) return;
    const { sessionId: newId } = await r.json() as { sessionId: string };
    localStorage.setItem("walkthru_session_id", newId);
    const session = await fetch(`/api/sessions?sessionId=${encodeURIComponent(newId)}`).then((r2) =>
      r2.ok ? r2.json() : null
    );
    if (session) setCurrentSession(session as GameSession);
  }

  async function toggleCommit(sha: string) {
    if (openSha === sha) {
      setOpenSha(null);
      return;
    }
    setOpenSha(sha);
    if (diffs[sha]) return;

    setDiffLoading(sha);
    try {
      const r = await fetch(
        `/api/commits/${encodeURIComponent(sha)}?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      const data = await r.json();
      if (!r.ok) {
        setDiffs((d) => ({ ...d, [sha]: { error: data.error ?? "Request failed" } }));
      } else {
        setDiffs((d) => ({ ...d, [sha]: data as CommitDetail }));
      }
    } catch {
      setDiffs((d) => ({ ...d, [sha]: { error: "Network error" } }));
    }
    setDiffLoading(null);
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-black text-white p-6 font-mono text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-6 max-w-6xl font-mono text-sm space-y-6">
        <h1 className="text-base font-bold text-white">Walkthru — GitHub OAuth Test</h1>

        {/* Auth status */}
        <div className="p-3 border border-gray-700 rounded space-y-2 text-white">
          {!status.replit_authed ? (
            <div className="flex items-center justify-between">
              <p className="text-gray-300">Sign in to continue</p>
              <a
                href="/dev-login"
                className="text-xs px-3 py-1 bg-white text-black rounded hover:bg-gray-200"
              >
                Dev login
              </a>
            </div>
          ) : !status.github_connected ? (
            <>
              <div className="flex items-center justify-between">
                <p>Signed in as <strong>{status.username}</strong></p>
                <button
                  onClick={async () => {
                    await fetch("/api/dev-login", { method: "DELETE" });
                    setStatus({ replit_authed: false, github_connected: false, username: null });
                    setUserProfile(null);
                    setConnectedRepos([]);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  log out
                </button>
              </div>
              <a
                href="/api/auth/github"
                className="inline-block px-3 py-1 bg-white text-black rounded text-xs hover:bg-gray-200"
              >
                Connect GitHub
              </a>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p>
                Signed in as <strong>{status.username}</strong> · GitHub connected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await fetch("/api/auth/github/disconnect", { method: "POST" });
                    setStatus((s) => s ? { ...s, github_connected: false } : s);
                    setUserProfile(null);
                    setConnectedRepos([]);
                  }}
                  className="text-xs text-gray-500 hover:text-red-400"
                >
                  disconnect GitHub
                </button>
                <button
                  onClick={async () => {
                    await fetch("/api/dev-login", { method: "DELETE" });
                    setStatus({ replit_authed: false, github_connected: false, username: null });
                    setUserProfile(null);
                    setConnectedRepos([]);
                    setCurrentSession(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  log out
                </button>
              </div>
            </div>
          )}
        </div>

        {status.github_connected && (
          <>
            {/* Repos */}
            <div className="space-y-2">
              <button
                onClick={fetchRepos}
                disabled={loading}
                className="px-3 py-1 bg-white text-black border border-gray-300 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
              >
                My Repos
              </button>
              {repos && (
                <ul className="border border-gray-700 rounded divide-y divide-gray-800">
                  {repos.map((r) => {
                    const isConnected = connectedRepos.some((cr) => cr.full_name === r.full_name);
                    return (
                      <li
                        key={r.full_name}
                        className="px-3 py-2 flex justify-between items-center hover:bg-gray-900"
                      >
                        <span
                          className="text-white cursor-pointer flex-1"
                          onClick={() => selectRepo(r.full_name)}
                        >
                          {r.full_name}
                        </span>
                        <div className="flex gap-2 items-center shrink-0">
                          <span className="text-gray-400 text-xs">
                            {r.private ? "private" : "public"}
                          </span>
                          <button
                            onClick={() => connectRepo(r.full_name)}
                            className={`px-2 py-0.5 text-xs rounded border ${
                              isConnected
                                ? "border-gray-600 text-gray-500 cursor-default"
                                : "border-gray-400 text-gray-200 hover:bg-gray-800"
                            }`}
                            disabled={isConnected}
                          >
                            {isConnected ? "connected" : "connect"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
                  className="border border-gray-700 rounded px-2 py-1 text-xs w-32 bg-gray-900 text-white placeholder-gray-500"
                />
                <span className="text-gray-400">/</span>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="repo"
                  className="border border-gray-700 rounded px-2 py-1 text-xs w-48 bg-gray-900 text-white placeholder-gray-500"
                />
                <button
                  onClick={fetchCommits}
                  disabled={loading || !owner || !repo}
                  className="px-3 py-1 bg-white text-black border border-gray-300 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Fetch Commits"}
                </button>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              {commits !== null && (
                <div className="flex gap-4 items-start flex-col md:flex-row">
                  <div className="space-y-1 flex-1 min-w-0 w-full">
                    <p className="text-xs text-gray-400">{commitTotal} commits</p>
                    <ul
                      id="commit-list"
                      className="border border-gray-700 rounded divide-y divide-gray-800 max-h-[600px] overflow-y-auto"
                    >
                      {commits.map((c) => {
                        const isOpen = openSha === c.sha;
                        const diff = diffs[c.sha];
                        return (
                          <li key={c.sha} id={`c-${c.sha}`} className="text-xs scroll-mt-2">
                          <button
                            onClick={() => toggleCommit(c.sha)}
                            className="w-full text-left px-3 py-1.5 flex gap-2 items-baseline hover:bg-gray-900 text-white"
                          >
                            <span className="text-gray-500 shrink-0">{isOpen ? "▼" : "▶"}</span>
                            <span className="text-gray-400 shrink-0">[{c.sha.slice(0, 7)}]</span>
                            <span className="text-gray-400 shrink-0">{c.date.slice(0, 10)}</span>
                            <span className="text-gray-300 shrink-0">{c.author}</span>
                            <span className="truncate text-white">{c.message.split("\n")[0]}</span>
                          </button>
                          {isOpen && (
                            <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 space-y-2 text-white">
                              {diffLoading === c.sha && (
                                <p className="text-gray-300">Loading diff...</p>
                              )}
                              {diff && "error" in diff && (
                                <p className="text-red-400">{diff.error}</p>
                              )}
                              {diff && "files" in diff && (
                                <>
                                  <p className="text-gray-300">
                                    {diff.files.length} files ·{" "}
                                    <span className="text-green-400">+{diff.stats.additions}</span>{" "}
                                    <span className="text-red-400">-{diff.stats.deletions}</span>
                                  </p>
                                  {diff.files.map((f) => (
                                    <div key={f.filename} className="space-y-1">
                                      <div className="flex gap-2 items-baseline">
                                        <span className="text-gray-400 uppercase text-[10px]">
                                          {f.status}
                                        </span>
                                        <span className="text-white font-semibold">
                                          {f.filename}
                                        </span>
                                        <span className="text-green-400">+{f.additions}</span>
                                        <span className="text-red-400">-{f.deletions}</span>
                                      </div>
                                      {f.patch ? (
                                        <pre className="overflow-x-auto bg-black border border-gray-800 rounded p-2 text-[11px] leading-snug">
                                          {f.patch.split("\n").map((line, i) => {
                                            let color = "text-gray-200";
                                            if (line.startsWith("+") && !line.startsWith("+++"))
                                              color = "text-green-400";
                                            else if (line.startsWith("-") && !line.startsWith("---"))
                                              color = "text-red-400";
                                            else if (line.startsWith("@@"))
                                              color = "text-blue-400";
                                            return (
                                              <div key={i} className={color}>
                                                {line || " "}
                                              </div>
                                            );
                                          })}
                                        </pre>
                                      ) : (
                                        <p className="text-gray-500 italic">
                                          (no patch — binary or too large)
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* My Account */}
            {userProfile && (
              <div className="border border-gray-700 rounded p-3 space-y-3">
                <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">My Account</h2>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={userProfile.github_avatar} alt="" className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-white font-semibold">{userProfile.github_username}</p>
                    <p className="text-gray-500 text-[11px]">
                      joined {userProfile.created_at?.slice(0, 10) ?? '—'} · active {userProfile.last_active?.slice(0, 10) ?? '—'}
                    </p>
                  </div>
                </div>

                {connectedRepos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400">Connected repos</p>
                    <ul className="border border-gray-800 rounded divide-y divide-gray-800">
                      {connectedRepos.map((cr) => (
                        <li key={cr.full_name} className="px-3 py-2 flex justify-between items-center">
                          <span className="text-white text-xs">{cr.full_name}</span>
                          <div className="flex gap-2 items-center text-[11px] shrink-0">
                            <span className="text-gray-500">{cr.connected_at.slice(0, 10)}</span>
                            <button
                              onClick={() => startSession(cr.full_name)}
                              className="px-2 py-0.5 border border-gray-600 rounded text-gray-300 hover:bg-gray-800"
                            >
                              start session
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Current Session */}
            {currentSession && (
              <div className="border border-gray-700 rounded p-3 space-y-3">
                <div className="flex justify-between items-baseline">
                  <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Current Session</h2>
                  <button
                    onClick={() => {
                    localStorage.removeItem("walkthru_session_id");
                    setCurrentSession(null);
                  }}
                    className="text-[11px] text-gray-500 hover:text-gray-300"
                  >
                    clear
                  </button>
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-gray-400">{currentSession.repo}</p>
                  <p className="text-white">
                    Score: <span className="font-bold">{currentSession.score}</span>
                    <span className="text-gray-500"> / {currentSession.total}</span>
                  </p>
                </div>
                {currentSession.attempts.length > 0 && (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {currentSession.attempts.map((a, i) => (
                      <li key={i} className="flex gap-2 items-start text-[11px]">
                        <span className={a.correct ? "text-green-400" : "text-red-400"}>
                          {a.correct ? "✓" : "✗"}
                        </span>
                        <span className="text-gray-300 flex-1">{a.question}</span>
                        {a.hint && <span className="text-gray-500 italic">{a.hint}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

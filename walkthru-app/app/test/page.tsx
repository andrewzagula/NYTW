"use client";

import { useState, useEffect } from "react";
import { Timeline, type CommitSummaryEntry } from "./components/Timeline";

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
  const [summary, setSummary] = useState<CommitSummaryEntry[] | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
    setOpenSha(null);
    setDiffs({});
    setSummary(null);
    setSummaryError(null);
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

    setSummaryLoading(true);
    try {
      const r = await fetch(
        `/api/commits-summary?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      const data = await r.json();
      if (!r.ok) {
        setSummaryError(data.error ?? "Request failed");
      } else {
        setSummary(data.summary as CommitSummaryEntry[]);
      }
    } catch {
      setSummaryError("Network error");
    }
    setSummaryLoading(false);
  }

  function scrollToCommit(sha: string) {
    const el = document.getElementById(`c-${sha}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-yellow-400");
      setTimeout(
        () => el.classList.remove("ring-2", "ring-yellow-400"),
        1000
      );
    }
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
    setSummary(null);
    setSummaryError(null);
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
            <p className="text-gray-300">Sign in via Replit to continue</p>
          ) : !status.github_connected ? (
            <>
              <p>Signed in as <strong>{status.username}</strong></p>
              <a
                href="/api/auth/github"
                className="inline-block px-3 py-1 bg-white text-black rounded text-xs hover:bg-gray-200"
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
                className="px-3 py-1 bg-white text-black border border-gray-300 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
              >
                My Repos
              </button>
              {repos && (
                <ul className="border border-gray-700 rounded divide-y divide-gray-800">
                  {repos.map((r) => (
                    <li
                      key={r.full_name}
                      onClick={() => selectRepo(r.full_name)}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-900 flex justify-between items-center"
                    >
                      <span className="text-white">{r.full_name}</span>
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
                  <aside className="w-full md:w-[220px] shrink-0 md:sticky md:top-4">
                    <Timeline
                      summary={summary}
                      loading={summaryLoading}
                      error={summaryError}
                      onSelectCommit={scrollToCommit}
                    />
                  </aside>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

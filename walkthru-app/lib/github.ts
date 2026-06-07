const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface Repo {
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
  description: string | null;
  owner?: { login: string };
  default_branch?: string;
  language?: string | null;
}

export type GitHubError = { error: string; status: number };

function authHeaders(token: string) {
  return { ...GH_HEADERS, Authorization: `Bearer ${token}` };
}

export async function fetchAllCommits(
  owner: string,
  repo: string,
  token: string,
  limit = 500
): Promise<Commit[] | GitHubError> {
  const commits: Commit[] = [];
  let page = 1;

  while (commits.length < limit) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: authHeaders(token) });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        error: (body as { message?: string }).message ?? res.statusText,
        status: res.status,
      };
    }

    const batch = (await res.json()) as Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
    }>;

    if (batch.length === 0) break;

    for (const item of batch) {
      commits.push({
        sha: item.sha,
        message: item.commit.message,
        author: item.commit.author.name,
        date: item.commit.author.date,
      });
      if (commits.length >= limit) break;
    }

    page++;
  }

  return commits;
}

export interface CommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface CommitDetail {
  sha: string;
  message: string;
  author: string;
  date: string;
  stats: { additions: number; deletions: number; total: number };
  files: CommitFile[];
}

export async function fetchCommitDiff(
  owner: string,
  repo: string,
  sha: string,
  token: string
): Promise<CommitDetail | GitHubError> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      error: (body as { message?: string }).message ?? res.statusText,
      status: res.status,
    };
  }

  const data = (await res.json()) as {
    sha: string;
    commit: { message: string; author: { name: string; date: string } };
    stats: { additions: number; deletions: number; total: number };
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string;
    }>;
  };

  return {
    sha: data.sha,
    message: data.commit.message,
    author: data.commit.author.name,
    date: data.commit.author.date,
    stats: data.stats,
    files: data.files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch ?? null,
    })),
  };
}

export interface CommitSummaryEntry {
  sha: string;
  date: string;
  author: string;
  additions: number;
  deletions: number;
}

async function fetchCommitStats(
  owner: string,
  repo: string,
  sha: string,
  token: string
): Promise<{ additions: number; deletions: number } | null> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) return null;
  const data = (await res.json()) as { stats?: { additions: number; deletions: number } };
  return data.stats ?? { additions: 0, deletions: 0 };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export async function fetchCommitsSummary(
  owner: string,
  repo: string,
  token: string,
  limit = 500
): Promise<CommitSummaryEntry[] | GitHubError> {
  const commits = await fetchAllCommits(owner, repo, token, limit);
  if ("error" in commits) return commits;

  const summary = await runWithConcurrency(commits, 8, async (c) => {
    const stats = await fetchCommitStats(owner, repo, c.sha, token);
    return {
      sha: c.sha,
      date: c.date,
      author: c.author,
      additions: stats?.additions ?? 0,
      deletions: stats?.deletions ?? 0,
    };
  });

  return summary;
}

export async function fetchUserRepos(
  token: string
): Promise<Repo[] | GitHubError> {
  const url =
    "https://api.github.com/user/repos?per_page=20&sort=updated&type=owner";
  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      error: (body as { message?: string }).message ?? res.statusText,
      status: res.status,
    };
  }

  const data = (await res.json()) as Array<{
    name: string;
    full_name: string;
    private: boolean;
    updated_at: string;
    description: string | null;
    owner?: { login: string };
    default_branch?: string;
    language?: string | null;
  }>;

  return data.map((r) => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    updated_at: r.updated_at,
    description: r.description,
    owner: r.owner,
    default_branch: r.default_branch,
    language: r.language,
  }));
}

export async function fetchRepoDetails(
  owner: string,
  repo: string,
  token: string
): Promise<Repo | GitHubError> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      error: (body as { message?: string }).message ?? res.statusText,
      status: res.status,
    };
  }

  const data = (await res.json()) as {
    name: string;
    full_name: string;
    private: boolean;
    updated_at: string;
    description: string | null;
    owner?: { login: string };
    default_branch?: string;
    language?: string | null;
  };

  return data;
}

export async function fetchRepoBranches(
  owner: string,
  repo: string,
  token: string
): Promise<string[] | GitHubError> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      error: (body as { message?: string }).message ?? res.statusText,
      status: res.status,
    };
  }

  const data = (await res.json()) as Array<{ name: string }>;
  return data.map((b) => b.name);
}

export async function fetchOpenPullRequestCount(
  owner: string,
  repo: string,
  token: string
): Promise<number | GitHubError> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=1`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      error: (body as { message?: string }).message ?? res.statusText,
      status: res.status,
    };
  }

  const link = res.headers.get("link");
  const last = link?.match(/[?&]page=(\d+)>;\s*rel="last"/)?.[1];
  if (last) return Number(last);

  const data = (await res.json()) as unknown[];
  return data.length;
}

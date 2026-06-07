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
  }>;

  return data.map((r) => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    updated_at: r.updated_at,
    description: r.description,
  }));
}

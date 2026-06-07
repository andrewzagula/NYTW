import { headers } from "next/headers";
import { getGithubToken, getSessionUser } from "@/lib/auth/server";
import { getUserRepos } from "@/lib/db";
import {
  fetchAllCommits,
  fetchOpenPullRequestCount,
  fetchRepoBranches,
  fetchRepoDetails,
  type Commit,
} from "@/lib/github";
import type { MockRepo } from "@/lib/mock/repos";
import type { TimelineNode } from "@/lib/mock/timeline";

export type RepoDataState =
  | { status: "unauthenticated" }
  | { status: "github_disconnected" }
  | { status: "ready"; repos: MockRepo[] };

export type TimelineDataState =
  | { status: "unauthenticated" }
  | { status: "github_disconnected" }
  | { status: "not_found" }
  | {
      status: "ready";
      repo: MockRepo;
      branches: string[];
      nodes: TimelineNode[];
      activeNode: TimelineNode | null;
    };

function repoId(fullName: string): string {
  return fullName.replace("/", "__");
}

export function fullNameFromRepoId(id: string): string {
  return id.replace("__", "/");
}

function splitFullName(fullName: string): { owner: string; name: string } | null {
  const [owner, name] = fullName.split("/");
  if (!owner || !name) return null;
  return { owner, name };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

async function currentUser() {
  const h = await headers();
  return getSessionUser(new Request("http://walkthru.local", { headers: h }));
}

async function githubTokenForCurrentUser() {
  const user = await currentUser();
  if (!user) return { user: null, token: null };
  return { user, token: await getGithubToken(user.id) };
}

async function buildRepo(fullName: string, token: string): Promise<MockRepo | null> {
  const parsed = splitFullName(fullName);
  if (!parsed) return null;

  const [details, branches, openPrs] = await Promise.all([
    fetchRepoDetails(parsed.owner, parsed.name, token),
    fetchRepoBranches(parsed.owner, parsed.name, token),
    fetchOpenPullRequestCount(parsed.owner, parsed.name, token),
  ]);

  if ("error" in details) return null;

  const branchList = "error" in branches ? [] : branches;
  const prCount = typeof openPrs === "number" ? openPrs : 0;

  return {
    id: repoId(details.full_name),
    owner: details.owner?.login ?? parsed.owner,
    name: details.name,
    description: details.description ?? "No repository description.",
    defaultBranch: details.default_branch ?? "main",
    branchCount: branchList.length || 1,
    openPrs: prCount,
    language: details.language ?? "Code",
    lastActivity: details.updated_at,
    teamScore: 0,
  };
}

export async function getConnectedRepoCards(): Promise<RepoDataState> {
  const { user, token } = await githubTokenForCurrentUser();
  if (!user) return { status: "unauthenticated" };
  if (!token) return { status: "github_disconnected" };

  const connected = await getUserRepos(user.id);
  const repos = (
    await Promise.all(connected.map((repo) => buildRepo(repo.full_name, token)))
  ).filter((repo): repo is MockRepo => repo !== null);

  return { status: "ready", repos };
}

function commitToTimelineNode(commit: Commit, defaultBranch: string): TimelineNode {
  const subject = commit.message.split("\n")[0] || "Untitled commit";
  return {
    sha: commit.sha.slice(0, 7),
    message: subject,
    author: { name: commit.author, initials: initials(commit.author) },
    date: commit.date,
    branch: defaultBranch,
    lane: 0,
    parents: [],
    score: null,
    type: subject.toLowerCase().startsWith("merge ") ? "merge" : "commit",
  };
}

export async function getRepoTimelineData(
  id: string,
  activeSha?: string,
): Promise<TimelineDataState> {
  const { user, token } = await githubTokenForCurrentUser();
  if (!user) return { status: "unauthenticated" };
  if (!token) return { status: "github_disconnected" };

  const fullName = fullNameFromRepoId(id);
  const parsed = splitFullName(fullName);
  if (!parsed) return { status: "not_found" };

  const connected = await getUserRepos(user.id);
  if (!connected.some((repo) => repo.full_name === fullName)) {
    return { status: "not_found" };
  }

  const [repo, branchesResult, commitsResult] = await Promise.all([
    buildRepo(fullName, token),
    fetchRepoBranches(parsed.owner, parsed.name, token),
    fetchAllCommits(parsed.owner, parsed.name, token, 100),
  ]);

  if (!repo || "error" in commitsResult) return { status: "not_found" };

  const branches =
    "error" in branchesResult || branchesResult.length === 0
      ? [repo.defaultBranch]
      : branchesResult;
  const nodes = commitsResult.map((commit) =>
    commitToTimelineNode(commit, repo.defaultBranch),
  );
  const activeNode = activeSha
    ? nodes.find((node) => node.sha === activeSha || activeSha.startsWith(node.sha)) ?? null
    : null;

  return { status: "ready", repo, branches, nodes, activeNode };
}

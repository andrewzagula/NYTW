import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createNewCommitSession, upsertUser } from "@/lib/db";
import { githubUserId } from "@/lib/auth/server";
import { generateCommitQuiz, type NewCommitPayload } from "@/lib/quiz/generator";
import { groundQuizWithPerseus } from "@/lib/quiz/grounding";

type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string;
};

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function validateGithubToken(token: string): Promise<GitHubUser | null> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) return null;
  return res.json() as Promise<GitHubUser>;
}

function parseRepoFromRemote(remoteUrl: string | undefined): string | null {
  if (!remoteUrl) return null;

  const httpsMatch = remoteUrl.match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  if (httpsMatch?.[1] && httpsMatch[2]) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  return null;
}

function repoName(payload: NewCommitPayload): string {
  if (payload.repository?.includes("/")) return payload.repository;
  return parseRepoFromRemote(payload.remoteUrl) ?? payload.repository ?? "unknown";
}

function publicBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const githubUser = await validateGithubToken(token).catch(() => null);
  if (!githubUser) {
    return NextResponse.json({ error: "Invalid GitHub token" }, { status: 401 });
  }

  let payload: NewCommitPayload;
  try {
    payload = (await request.json()) as NewCommitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.commitDescription?.trim()) {
    return NextResponse.json(
      { error: "commitDescription is required" },
      { status: 400 }
    );
  }

  let questions;
  try {
    questions = await generateCommitQuiz(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz generation failed";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  // Ground each question in repository code via perseus. Never throws — an
  // ungrounded question keeps its empty snippets and the UI degrades cleanly.
  questions = await groundQuizWithPerseus(questions);

  const userId = githubUserId(githubUser.id);
  await upsertUser(userId, {
    github_username: githubUser.login,
    github_avatar: githubUser.avatar_url,
  });

  const sessionId = await createNewCommitSession(userId, {
    repo: repoName(payload),
    commitSha: payload.commitSha ?? null,
    commitId: payload.commitId ?? null,
    commitMessage: payload.commitMessage ?? null,
    commitDescription: payload.commitDescription,
    branch: payload.branch ?? null,
    remoteUrl: payload.remoteUrl ?? null,
    source: payload.source ?? null,
    questions,
  });

  const baseUrl = publicBaseUrl(request);
  const url = new URL(`/q/${sessionId}`, baseUrl).toString();

  const repo = repoName(payload);
  let commitUrl: string | null = null;
  if (repo.includes("/") && repo !== "unknown" && payload.commitSha) {
    const commitPath = new URL(`/repos/${repo}`, baseUrl);
    if (payload.branch) {
      commitPath.searchParams.set("branch", payload.branch);
    }
    commitPath.searchParams.set("commit", payload.commitSha);
    commitUrl = commitPath.toString();
  }

  return NextResponse.json({ url, sessionId, commitUrl });
}

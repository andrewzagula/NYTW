import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, getGithubToken } from "@/lib/auth/server";
import { fetchCommitDiff } from "@/lib/github";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sha: string }> }
) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sha } = await params;
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 }
    );
  }

  const token = await getGithubToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "GitHub not connected", connect_url: "/api/auth/github" },
      { status: 403 }
    );
  }

  const result = await fetchCommitDiff(owner, repo, sha, token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

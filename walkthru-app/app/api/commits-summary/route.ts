import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, getGithubToken } from "@/lib/auth";
import { fetchCommitsSummary } from "@/lib/github";

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 500;

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

  const result = await fetchCommitsSummary(owner, repo, token, limit);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ total: result.length, summary: result });
}

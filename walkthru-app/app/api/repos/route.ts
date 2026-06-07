import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, getGithubToken } from "@/lib/auth";
import { fetchUserRepos } from "@/lib/github";

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = await getGithubToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "GitHub not connected", connect_url: "/api/auth/github" },
      { status: 403 }
    );
  }

  const result = await fetchUserRepos(token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ repos: result });
}

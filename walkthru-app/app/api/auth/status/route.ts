import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, getGithubToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);

  if (!user) {
    return NextResponse.json({
      replit_authed: false,
      github_connected: false,
      username: null,
    });
  }

  const token = await getGithubToken(user.id);

  return NextResponse.json({
    replit_authed: true,
    github_connected: token !== null,
    username: user.name,
  });
}

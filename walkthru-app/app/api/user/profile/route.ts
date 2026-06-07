import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUser, getUserRepos } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sessionUser = getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [user, repos] = await Promise.all([
    getUser(sessionUser.id),
    getUserRepos(sessionUser.id),
  ]);

  return NextResponse.json({ user, repos });
}

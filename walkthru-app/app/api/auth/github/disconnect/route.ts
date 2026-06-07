import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, deleteGithubToken } from "@/lib/auth";
import { getPool } from "@/lib/postgres";

export async function POST(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await deleteGithubToken(user.id);

  // Also wipe the user profile so it gets recreated cleanly on next connect
  await getPool().query(`DELETE FROM users WHERE id = $1`, [user.id]);

  return NextResponse.json({ ok: true });
}

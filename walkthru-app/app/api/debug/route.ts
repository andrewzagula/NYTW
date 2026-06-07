import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server";
import { getPool, initDb } from "@/lib/postgres";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  try {
    await initDb();
    const pool = getPool();

    const [users, tokens, repos, sessions, attempts] = await Promise.all([
      pool.query("SELECT * FROM users"),
      pool.query("SELECT user_id, left(token, 8) || '...' AS token FROM github_tokens"),
      pool.query("SELECT * FROM connected_repos ORDER BY user_id, connected_at"),
      pool.query("SELECT * FROM sessions ORDER BY started_at DESC"),
      pool.query("SELECT * FROM attempts ORDER BY created_at"),
    ]);

    return NextResponse.json({
      session_user: getSessionUser(request),
      users: users.rows,
      tokens: tokens.rows,
      repos: repos.rows,
      sessions: sessions.rows,
      attempts: attempts.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

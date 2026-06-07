import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

// Creates all tables if they don't exist yet. Call once at startup.
export async function initDb(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      github_username TEXT NOT NULL,
      github_avatar   TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_active  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS github_tokens (
      user_id TEXT PRIMARY KEY,
      token   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connected_repos (
      user_id      TEXT NOT NULL,
      full_name    TEXT NOT NULL,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_indexed TIMESTAMPTZ,
      index_job_id TEXT,
      PRIMARY KEY (user_id, full_name)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      repo       TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      score      INTEGER NOT NULL DEFAULT 0,
      total      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id         SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      question   TEXT NOT NULL,
      correct    BOOLEAN NOT NULL,
      hint       TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

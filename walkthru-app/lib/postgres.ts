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
      commit_sha TEXT,
      commit_id  TEXT,
      commit_message TEXT,
      commit_description TEXT,
      branch     TEXT,
      remote_url TEXT,
      source     TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      score      INTEGER NOT NULL DEFAULT 0,
      total      INTEGER NOT NULL DEFAULT 0
    );

    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS commit_sha TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS commit_id TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS commit_message TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS commit_description TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS branch TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS remote_url TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS superseded BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS sessions_active_idx
      ON sessions (user_id, repo, commit_sha) WHERE superseded = FALSE;

    CREATE TABLE IF NOT EXISTS attempts (
      id         SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      question   TEXT NOT NULL,
      correct    BOOLEAN NOT NULL,
      hint       TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id              SERIAL PRIMARY KEY,
      session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      question_order  INTEGER NOT NULL,
      question        TEXT NOT NULL,
      expected_answer TEXT NOT NULL,
      explanation     TEXT NOT NULL,
      context_summary TEXT,
      snippets        JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (session_id, question_order)
    );

    ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS options JSONB;
    ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
    ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';
    ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS parent_question_id INTEGER;

    -- Per-commit chat threads, private to each user. One row per message,
    -- ordered by seq within (user_id, repo, commit_sha).
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      repo       TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      seq        INTEGER NOT NULL,
      role       TEXT NOT NULL,
      parts      JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, repo, commit_sha, seq)
    );

    CREATE INDEX IF NOT EXISTS chat_messages_thread_idx
      ON chat_messages (user_id, repo, commit_sha);
  `);
}

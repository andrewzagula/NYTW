import { getPool, initDb } from "./postgres";

// --- Types ---

export type User = {
  id: string;
  github_username: string;
  github_avatar: string;
  created_at: string;
  last_active: string;
};

export type ConnectedRepo = {
  full_name: string;
  connected_at: string;
  last_indexed: string | null;
  index_job_id: string | null;
};

export type Attempt = {
  id: number;
  session_id: string;
  question: string;
  correct: boolean;
  hint: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  repo: string;
  started_at: string;
  score: number;
  total: number;
  attempts: Attempt[];
};

let _initialized = false;
async function db() {
  if (!_initialized) {
    await initDb();
    _initialized = true;
  }
  return getPool();
}

// --- User ---

export async function upsertUser(
  id: string,
  data: { github_username: string; github_avatar: string }
): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO users (id, github_username, github_avatar)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE
       SET github_username = EXCLUDED.github_username,
           github_avatar   = EXCLUDED.github_avatar,
           last_active     = NOW()`,
    [id, data.github_username, data.github_avatar]
  );
}

export async function getUser(id: string): Promise<User | null> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT id, github_username, github_avatar,
            created_at::text, last_active::text
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

// --- Repos ---

export async function connectRepo(
  userId: string,
  owner: string,
  name: string
): Promise<void> {
  const pool = await db();
  const fullName = `${owner}/${name}`;
  await pool.query(
    `INSERT INTO connected_repos (user_id, full_name)
     VALUES ($1, $2)
     ON CONFLICT (user_id, full_name) DO NOTHING`,
    [userId, fullName]
  );
}

export async function getUserRepos(userId: string): Promise<ConnectedRepo[]> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT full_name,
            connected_at::text,
            last_indexed::text,
            index_job_id
     FROM connected_repos WHERE user_id = $1
     ORDER BY connected_at`,
    [userId]
  );
  return rows;
}

export async function updateRepoIndex(
  userId: string,
  owner: string,
  name: string,
  jobId: string
): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE connected_repos SET index_job_id = $1
     WHERE user_id = $2 AND full_name = $3`,
    [jobId, userId, `${owner}/${name}`]
  );
}

export async function markRepoIndexed(
  userId: string,
  owner: string,
  name: string
): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE connected_repos SET last_indexed = NOW()
     WHERE user_id = $1 AND full_name = $2`,
    [userId, `${owner}/${name}`]
  );
}

// --- Sessions ---

export async function createSession(userId: string, repo: string): Promise<string> {
  const pool = await db();
  const sessionId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO sessions (id, user_id, repo) VALUES ($1, $2, $3)`,
    [sessionId, userId, repo]
  );
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const pool = await db();
  const { rows: sessionRows } = await pool.query(
    `SELECT id, user_id, repo, started_at::text, score, total
     FROM sessions WHERE id = $1`,
    [sessionId]
  );
  if (!sessionRows[0]) return null;

  const { rows: attemptRows } = await pool.query(
    `SELECT id, session_id, question, correct, hint, created_at::text
     FROM attempts WHERE session_id = $1
     ORDER BY created_at`,
    [sessionId]
  );

  return { ...sessionRows[0], attempts: attemptRows };
}

export async function recordAttempt(
  sessionId: string,
  attempt: { question: string; correct: boolean; hint?: string }
): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO attempts (session_id, question, correct, hint)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, attempt.question, attempt.correct, attempt.hint ?? null]
  );
  await pool.query(
    `UPDATE sessions
     SET total = total + 1,
         score = score + $1
     WHERE id = $2`,
    [attempt.correct ? 1 : 0, sessionId]
  );
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const pool = await db();
  const { rows: sessionRows } = await pool.query(
    `SELECT id, user_id, repo, started_at::text, score, total
     FROM sessions WHERE user_id = $1
     ORDER BY started_at DESC`,
    [userId]
  );
  if (sessionRows.length === 0) return [];

  const ids = sessionRows.map((s) => s.id);
  const { rows: attemptRows } = await pool.query(
    `SELECT id, session_id, question, correct, hint, created_at::text
     FROM attempts WHERE session_id = ANY($1)
     ORDER BY created_at`,
    [ids]
  );

  const attemptsBySession = attemptRows.reduce<Record<string, Attempt[]>>((acc, a) => {
    (acc[a.session_id] ??= []).push(a);
    return acc;
  }, {});

  return sessionRows.map((s) => ({ ...s, attempts: attemptsBySession[s.id] ?? [] }));
}

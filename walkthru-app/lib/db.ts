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

export type QuizSnippet = {
  path: string;
  lineStart?: number | null;
  lineEnd?: number | null;
  snippet: string;
};

export type QuizQuestion = {
  id: number;
  session_id: string;
  question_order: number;
  question: string;
  expected_answer: string;
  explanation: string;
  context_summary: string | null;
  snippets: QuizSnippet[];
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  repo: string;
  commit_sha: string | null;
  commit_id: string | null;
  commit_message: string | null;
  commit_description: string | null;
  branch: string | null;
  remote_url: string | null;
  source: string | null;
  started_at: string;
  score: number;
  total: number;
  questions: QuizQuestion[];
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

export type NewCommitSessionInput = {
  repo: string;
  commitSha?: string | null;
  commitId?: string | null;
  commitMessage?: string | null;
  commitDescription: string;
  branch?: string | null;
  remoteUrl?: string | null;
  source?: string | null;
  questions: Array<{
    question: string;
    expectedAnswer: string;
    explanation: string;
    contextSummary?: string | null;
    snippets?: QuizSnippet[];
  }>;
};

export async function createNewCommitSession(
  userId: string,
  input: NewCommitSessionInput
): Promise<string> {
  const pool = await db();
  const sessionId = crypto.randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO sessions (
         id, user_id, repo, commit_sha, commit_id, commit_message,
         commit_description, branch, remote_url, source
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId,
        userId,
        input.repo,
        input.commitSha ?? null,
        input.commitId ?? null,
        input.commitMessage ?? null,
        input.commitDescription,
        input.branch ?? null,
        input.remoteUrl ?? null,
        input.source ?? null,
      ]
    );

    for (const [index, question] of input.questions.entries()) {
      await client.query(
        `INSERT INTO quiz_questions (
           session_id, question_order, question, expected_answer,
           explanation, context_summary, snippets
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          index + 1,
          question.question,
          question.expectedAnswer,
          question.explanation,
          question.contextSummary ?? null,
          JSON.stringify(question.snippets ?? []),
        ]
      );
    }

    await client.query("COMMIT");
    return sessionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const pool = await db();
  const { rows: sessionRows } = await pool.query(
    `SELECT id, user_id, repo, commit_sha, commit_id, commit_message,
            commit_description, branch, remote_url, source,
            started_at::text, score, total
     FROM sessions WHERE id = $1`,
    [sessionId]
  );
  if (!sessionRows[0]) return null;

  const { rows: questionRows } = await pool.query(
    `SELECT id, session_id, question_order, question, expected_answer,
            explanation, context_summary, snippets, created_at::text
     FROM quiz_questions WHERE session_id = $1
     ORDER BY question_order`,
    [sessionId]
  );

  const { rows: attemptRows } = await pool.query(
    `SELECT id, session_id, question, correct, hint, created_at::text
     FROM attempts WHERE session_id = $1
     ORDER BY created_at`,
    [sessionId]
  );

  return { ...sessionRows[0], questions: questionRows, attempts: attemptRows };
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
    `SELECT id, user_id, repo, commit_sha, commit_id, commit_message,
            commit_description, branch, remote_url, source,
            started_at::text, score, total
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

  const { rows: questionRows } = await pool.query(
    `SELECT id, session_id, question_order, question, expected_answer,
            explanation, context_summary, snippets, created_at::text
     FROM quiz_questions WHERE session_id = ANY($1)
     ORDER BY question_order`,
    [ids]
  );

  const attemptsBySession = attemptRows.reduce<Record<string, Attempt[]>>((acc, a) => {
    (acc[a.session_id] ??= []).push(a);
    return acc;
  }, {});

  const questionsBySession = questionRows.reduce<Record<string, QuizQuestion[]>>((acc, q) => {
    (acc[q.session_id] ??= []).push(q);
    return acc;
  }, {});

  return sessionRows.map((s) => ({
    ...s,
    questions: questionsBySession[s.id] ?? [],
    attempts: attemptsBySession[s.id] ?? [],
  }));
}

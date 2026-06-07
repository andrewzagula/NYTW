import type { UIMessage } from "ai";
import { getPool, initDb } from "./postgres";
import { messagesToRows, rowsToMessages } from "./chat/persistence";
import type { Choice, Difficulty, McqOptions, McqQuestion } from "./quiz/mcq";

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

// --- Per-commit chat ---

/** Load a user's saved chat thread for one commit, ordered by seq. */
export async function getChatMessages(
  userId: string,
  repo: string,
  commitSha: string
): Promise<UIMessage[]> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT id, role, parts
     FROM chat_messages
     WHERE user_id = $1 AND repo = $2 AND commit_sha = $3
     ORDER BY seq`,
    [userId, repo, commitSha]
  );
  return rowsToMessages(rows);
}

/**
 * Replace a user's saved chat thread for one commit with `messages`. Called
 * after a stream finishes, when the full conversation is known.
 */
export async function saveChatMessages(
  userId: string,
  repo: string,
  commitSha: string,
  messages: UIMessage[]
): Promise<void> {
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM chat_messages
       WHERE user_id = $1 AND repo = $2 AND commit_sha = $3`,
      [userId, repo, commitSha]
    );
    for (const row of messagesToRows(messages)) {
      await client.query(
        `INSERT INTO chat_messages (id, user_id, repo, commit_sha, seq, role, parts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.id,
          userId,
          repo,
          commitSha,
          row.seq,
          row.role,
          JSON.stringify(row.parts ?? []),
        ]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** SHAs in `repo` that have at least one saved chat message for this user. */
export async function getCommitsWithChats(
  userId: string,
  repo: string
): Promise<Set<string>> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT DISTINCT commit_sha
     FROM chat_messages
     WHERE user_id = $1 AND repo = $2`,
    [userId, repo]
  );
  return new Set(rows.map((r) => r.commit_sha as string));
}

// --- MCQ quiz sessions (per-commit) ---

export type StoredMcqQuestion = {
  id: number;
  questionOrder: number;
  question: string;
  options: McqOptions;
  correctAnswer: Choice;
  explanation: string;
  difficulty: Difficulty;
  parentQuestionId: number | null;
};

export type StoredMcqAttempt = {
  id: number;
  question: string;
  correct: boolean;
  /** Stored in attempts.hint — the option letter the user selected. */
  choice: string | null;
  createdAt: string;
};

export type QuizSessionState = {
  sessionId: string;
  repo: string;
  commitSha: string;
  startedAt: string;
  finishedAt: string | null;
  score: number;
  total: number;
  questions: StoredMcqQuestion[];
  attempts: StoredMcqAttempt[];
};

export type CommitScore = {
  commitSha: string;
  score: number;
  total: number;
  percent: number;
};

function parseStoredQuestion(row: Record<string, unknown>): StoredMcqQuestion {
  const optionsRaw = row.options as McqOptions | string | null;
  const options: McqOptions =
    typeof optionsRaw === "string"
      ? (JSON.parse(optionsRaw) as McqOptions)
      : (optionsRaw as McqOptions);
  return {
    id: row.id as number,
    questionOrder: row.question_order as number,
    question: row.question as string,
    options,
    correctAnswer: (row.correct_answer as Choice) ?? "A",
    explanation: (row.explanation as string) ?? "",
    difficulty: (row.difficulty as Difficulty) ?? "medium",
    parentQuestionId: (row.parent_question_id as number | null) ?? null,
  };
}

export async function getActiveQuizSession(
  userId: string,
  repo: string,
  commitSha: string,
): Promise<QuizSessionState | null> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT id, started_at::text, finished_at::text, score, total
       FROM sessions
       WHERE user_id = $1 AND repo = $2 AND commit_sha = $3 AND superseded = FALSE
       ORDER BY started_at DESC
       LIMIT 1`,
    [userId, repo, commitSha],
  );
  if (!rows[0]) return null;
  const sessionId = rows[0].id as string;

  const { rows: qRows } = await pool.query(
    `SELECT id, question_order, question, options, correct_answer,
            explanation, difficulty, parent_question_id
       FROM quiz_questions
       WHERE session_id = $1
       ORDER BY question_order`,
    [sessionId],
  );
  const { rows: aRows } = await pool.query(
    `SELECT id, question, correct, hint, created_at::text
       FROM attempts
       WHERE session_id = $1
       ORDER BY created_at`,
    [sessionId],
  );

  return {
    sessionId,
    repo,
    commitSha,
    startedAt: rows[0].started_at as string,
    finishedAt: rows[0].finished_at as string | null,
    score: rows[0].score as number,
    total: rows[0].total as number,
    questions: qRows.map((r) => parseStoredQuestion(r as Record<string, unknown>)),
    attempts: aRows.map((r) => ({
      id: r.id as number,
      question: r.question as string,
      correct: r.correct as boolean,
      choice: (r.hint as string | null) ?? null,
      createdAt: r.created_at as string,
    })),
  };
}

export async function createQuizSession(
  userId: string,
  input: {
    repo: string;
    commitSha: string;
    commitMessage?: string | null;
    branch?: string | null;
    questions: McqQuestion[];
  },
): Promise<string> {
  const pool = await db();
  const sessionId = crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO sessions (id, user_id, repo, commit_sha, commit_message, branch, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'quiz')`,
      [
        sessionId,
        userId,
        input.repo,
        input.commitSha,
        input.commitMessage ?? null,
        input.branch ?? null,
      ],
    );
    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i];
      await client.query(
        `INSERT INTO quiz_questions (
           session_id, question_order, question, expected_answer, explanation,
           options, correct_answer, difficulty
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sessionId,
          i + 1,
          q.question,
          q.options[q.correctAnswer],
          q.explanation,
          JSON.stringify(q.options),
          q.correctAnswer,
          q.difficulty,
        ],
      );
    }
    await client.query("COMMIT");
    return sessionId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function appendQuizQuestion(
  sessionId: string,
  question: McqQuestion,
  parentQuestionId: number,
): Promise<StoredMcqQuestion> {
  const pool = await db();
  const { rows: maxRows } = await pool.query(
    `SELECT COALESCE(MAX(question_order), 0) AS m FROM quiz_questions WHERE session_id = $1`,
    [sessionId],
  );
  const order = (maxRows[0]?.m as number) + 1;
  const { rows } = await pool.query(
    `INSERT INTO quiz_questions (
       session_id, question_order, question, expected_answer, explanation,
       options, correct_answer, difficulty, parent_question_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, question_order, question, options, correct_answer,
               explanation, difficulty, parent_question_id`,
    [
      sessionId,
      order,
      question.question,
      question.options[question.correctAnswer],
      question.explanation,
      JSON.stringify(question.options),
      question.correctAnswer,
      question.difficulty,
      parentQuestionId,
    ],
  );
  return parseStoredQuestion(rows[0] as Record<string, unknown>);
}

export async function recordMcqAttempt(
  sessionId: string,
  attempt: { question: string; correct: boolean; choice: string },
): Promise<void> {
  await recordAttempt(sessionId, {
    question: attempt.question,
    correct: attempt.correct,
    hint: attempt.choice,
  });
}

export async function finishQuizSession(sessionId: string): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE sessions SET finished_at = NOW() WHERE id = $1 AND finished_at IS NULL`,
    [sessionId],
  );
}

export async function supersedeQuizSessions(
  userId: string,
  repo: string,
  commitSha: string,
): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE sessions SET superseded = TRUE
       WHERE user_id = $1 AND repo = $2 AND commit_sha = $3 AND superseded = FALSE`,
    [userId, repo, commitSha],
  );
}

/** Latest finished score per commit for one repo, used for timeline badges. */
export async function getRepoCommitScores(
  userId: string,
  repo: string,
): Promise<CommitScore[]> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (commit_sha) commit_sha, score, total
       FROM sessions
       WHERE user_id = $1 AND repo = $2 AND superseded = FALSE
             AND finished_at IS NOT NULL AND commit_sha IS NOT NULL
       ORDER BY commit_sha, started_at DESC`,
    [userId, repo],
  );
  return rows.map((r) => {
    const score = r.score as number;
    const total = (r.total as number) || 0;
    return {
      commitSha: r.commit_sha as string,
      score,
      total,
      percent: total > 0 ? Math.round((score / total) * 100) : 0,
    };
  });
}

/** Per-repo average percent across all quizzed commits, used for dashboard. */
export async function getUserRepoAverages(
  userId: string,
): Promise<Record<string, { avgPercent: number; quizzedCommits: number }>> {
  const pool = await db();
  const { rows } = await pool.query(
    `WITH latest AS (
       SELECT DISTINCT ON (repo, commit_sha) repo, commit_sha, score, total
         FROM sessions
         WHERE user_id = $1 AND superseded = FALSE
               AND finished_at IS NOT NULL AND commit_sha IS NOT NULL
               AND total > 0
         ORDER BY repo, commit_sha, started_at DESC
     )
     SELECT repo,
            COUNT(*)::int AS commits,
            AVG(score::float / NULLIF(total, 0))::float AS avg_ratio
       FROM latest
       GROUP BY repo`,
    [userId],
  );
  const out: Record<string, { avgPercent: number; quizzedCommits: number }> = {};
  for (const r of rows) {
    out[r.repo as string] = {
      avgPercent: Math.round(((r.avg_ratio as number) ?? 0) * 100),
      quizzedCommits: r.commits as number,
    };
  }
  return out;
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

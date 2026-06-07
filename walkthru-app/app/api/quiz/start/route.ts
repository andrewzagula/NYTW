import { getSessionUser, getGithubToken } from "@/lib/auth/server";
import {
  createQuizSession,
  finishQuizSession,
  getActiveQuizSession,
} from "@/lib/db";
import { generateInitialMcqs } from "@/lib/quiz/mcq";
import { loadGenInput } from "@/lib/quiz/diff";
import { deriveQuizState } from "@/lib/quiz/state";
import { INITIAL_QUESTION_COUNT } from "@/lib/quiz/api-shape";

export const maxDuration = 30;

type Body = { owner?: string; name?: string; commitSha?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { owner, name, commitSha } = body;
  if (!owner || !name || !commitSha) {
    return Response.json({ error: "owner, name, commitSha required" }, { status: 400 });
  }

  const user = getSessionUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const repo = `${owner}/${name}`;

  const existing = await getActiveQuizSession(user.id, repo, commitSha);
  if (existing) {
    return Response.json({ state: deriveQuizState(existing) });
  }

  const token = await getGithubToken(user.id);
  if (!token) return Response.json({ error: "GitHub not connected" }, { status: 401 });

  let genInput;
  try {
    genInput = await loadGenInput(owner, name, commitSha, token);
  } catch (err) {
    return Response.json(
      { error: `Could not load commit diff: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let questions;
  try {
    questions = await generateInitialMcqs(genInput, {
      difficulty: "medium",
      count: INITIAL_QUESTION_COUNT,
    });
  } catch (err) {
    return Response.json(
      { error: `Question generation failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const sessionId = await createQuizSession(user.id, {
    repo,
    commitSha,
    commitMessage: genInput.commitMessage ?? null,
    questions,
  });

  // If somehow zero questions, finish immediately so the UI doesn't hang.
  if (questions.length === 0) await finishQuizSession(sessionId);

  const fresh = await getActiveQuizSession(user.id, repo, commitSha);
  if (!fresh) {
    return Response.json({ error: "Session not found after create" }, { status: 500 });
  }
  return Response.json({ state: deriveQuizState(fresh) });
}

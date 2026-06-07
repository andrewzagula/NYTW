import { getSessionUser, getGithubToken } from "@/lib/auth/server";
import {
  appendQuizQuestion,
  finishQuizSession,
  getActiveQuizSession,
  recordMcqAttempt,
} from "@/lib/db";
import { generateFollowUpMcq, gradeMcq, type Choice } from "@/lib/quiz/mcq";
import { loadGenInput } from "@/lib/quiz/diff";
import { deriveQuizState } from "@/lib/quiz/state";
import { MAX_QUESTIONS } from "@/lib/quiz/api-shape";

export const maxDuration = 30;

type Body = {
  owner?: string;
  name?: string;
  commitSha?: string;
  questionId?: number;
  choice?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { owner, name, commitSha, questionId, choice } = body;
  if (!owner || !name || !commitSha || typeof questionId !== "number" || !choice) {
    return Response.json(
      { error: "owner, name, commitSha, questionId, choice required" },
      { status: 400 },
    );
  }
  const choiceLetter = String(choice).trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(choiceLetter)) {
    return Response.json({ error: "choice must be A/B/C/D" }, { status: 400 });
  }

  const user = getSessionUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const repo = `${owner}/${name}`;
  const session = await getActiveQuizSession(user.id, repo, commitSha);
  if (!session) {
    return Response.json({ error: "No active session" }, { status: 404 });
  }
  if (session.finishedAt) {
    return Response.json({ state: deriveQuizState(session) });
  }

  const question = session.questions.find((q) => q.id === questionId);
  if (!question) {
    return Response.json({ error: "Unknown question" }, { status: 404 });
  }

  // Idempotency: ignore re-submission of a question that's already attempted.
  if (session.attempts.some((a) => a.question === question.question)) {
    return Response.json({ state: deriveQuizState(session) });
  }

  const correct = gradeMcq(
    { correctAnswer: question.correctAnswer },
    choiceLetter,
  );
  await recordMcqAttempt(session.sessionId, {
    question: question.question,
    correct,
    choice: choiceLetter,
  });

  // If still under the cap and they got it wrong, generate one easier follow-up.
  const totalAfter = session.questions.length;
  if (!correct && totalAfter < MAX_QUESTIONS) {
    const token = await getGithubToken(user.id);
    if (token) {
      try {
        const genInput = await loadGenInput(owner, name, commitSha, token);
        const followUp = await generateFollowUpMcq(
          genInput,
          {
            questionId: `q${question.questionOrder}`,
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer as Choice,
            explanation: question.explanation,
            difficulty: question.difficulty,
          },
          { difficulty: "easy" },
        );
        await appendQuizQuestion(session.sessionId, followUp, question.id);
      } catch (err) {
        // Generation failure shouldn't block the quiz; we just won't add a
        // follow-up. The session will simply move to the next question or finish.
        console.error("Follow-up generation failed:", err);
      }
    }
  }

  const refreshed = await getActiveQuizSession(user.id, repo, commitSha);
  if (!refreshed) return Response.json({ error: "Session vanished" }, { status: 500 });

  const next = refreshed.questions
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .find((q) => !refreshed.attempts.some((a) => a.question === q.question));

  if (!next) {
    await finishQuizSession(refreshed.sessionId);
    const finished = await getActiveQuizSession(user.id, repo, commitSha);
    return Response.json({ state: deriveQuizState(finished ?? refreshed) });
  }

  return Response.json({ state: deriveQuizState(refreshed) });
}

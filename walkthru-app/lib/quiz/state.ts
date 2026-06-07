import type { QuizSessionState, StoredMcqQuestion } from "@/lib/db";
import {
  toPublicQuestion,
  type AnsweredQuestion,
  type QuizState,
  MAX_QUESTIONS,
} from "./api-shape";

/**
 * Derive the public quiz state from a stored session. Treats a question as
 * "answered" once an attempt row matches its text. The first un-attempted
 * question (lowest order) becomes `current`.
 */
export function deriveQuizState(session: QuizSessionState): QuizState {
  const attempts = session.attempts;
  // Map question text -> attempt result, since attempts.question stores the text.
  const answeredByText = new Map<string, { correct: boolean; choice: string | null }>();
  for (const a of attempts) {
    answeredByText.set(a.question, { correct: a.correct, choice: a.choice });
  }

  const ordered = [...session.questions]
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .slice(0, MAX_QUESTIONS);

  const answered: AnsweredQuestion[] = [];
  let current: StoredMcqQuestion | null = null;
  for (const q of ordered) {
    const att = answeredByText.get(q.question);
    if (att) {
      const choice = (att.choice ?? (att.correct ? q.correctAnswer : "A"))
        .toUpperCase() as "A" | "B" | "C" | "D";
      answered.push({
        ...toPublicQuestion(q),
        userChoice: choice,
        correctAnswer: q.correctAnswer,
        correct: att.correct,
        explanation: q.explanation,
      });
    } else if (!current) {
      current = q;
    }
  }

  const correctCount = answered.filter((a) => a.correct).length;
  const total = answered.length + (current ? 1 : 0);
  const finished = !current && session.finishedAt !== null;
  const scorePercent =
    finished && answered.length > 0
      ? Math.round((correctCount / answered.length) * 100)
      : null;

  return {
    sessionId: session.sessionId,
    status: finished ? "finished" : "in_progress",
    total,
    answeredCount: answered.length,
    correctCount,
    cap: MAX_QUESTIONS,
    answered,
    current: current ? toPublicQuestion(current) : null,
    scorePercent,
  };
}

import type { StoredMcqQuestion } from "@/lib/db";

export const MAX_QUESTIONS = 6;
export const INITIAL_QUESTION_COUNT = 3;

export type PublicQuestion = {
  id: number;
  order: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  difficulty: string;
};

export type AnsweredQuestion = PublicQuestion & {
  userChoice: "A" | "B" | "C" | "D";
  correctAnswer: "A" | "B" | "C" | "D";
  correct: boolean;
  explanation: string;
};

export type QuizState = {
  sessionId: string;
  status: "in_progress" | "finished";
  total: number; // total questions asked so far
  answeredCount: number;
  correctCount: number;
  cap: number;
  /** Questions already answered, with full answer info. */
  answered: AnsweredQuestion[];
  /** Current unanswered question, if any. */
  current: PublicQuestion | null;
  /** Final score percent — only set when finished. */
  scorePercent: number | null;
};

export function toPublicQuestion(q: StoredMcqQuestion): PublicQuestion {
  return {
    id: q.id,
    order: q.questionOrder,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
  };
}

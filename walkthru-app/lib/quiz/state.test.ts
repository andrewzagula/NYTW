import { describe, expect, it } from "vitest";
import { deriveQuizState } from "@/lib/quiz/state";
import type { QuizSessionState, StoredMcqQuestion } from "@/lib/db";

function q(order: number): StoredMcqQuestion {
  return {
    id: order,
    questionOrder: order,
    question: `Question ${order}?`,
    options: { A: "A", B: "B", C: "C", D: "D" },
    correctAnswer: "A",
    explanation: `Explanation ${order}`,
    difficulty: "medium",
    parentQuestionId: null,
  };
}

function session(overrides: Partial<QuizSessionState> = {}): QuizSessionState {
  return {
    sessionId: "session-1",
    repo: "owner/repo",
    commitSha: "abc123",
    startedAt: "2026-06-07T00:00:00.000Z",
    finishedAt: null,
    score: 0,
    total: 0,
    questions: [q(1), q(2), q(3), q(4), q(5), q(6)],
    attempts: [],
    ...overrides,
  };
}

describe("deriveQuizState", () => {
  it("caps visible quiz questions at 3 even when more are stored", () => {
    const state = deriveQuizState(session());

    expect(state.cap).toBe(3);
    expect(state.total).toBe(1);
    expect(state.current?.question).toBe("Question 1?");
  });

  it("finishes after the first 3 stored questions are answered", () => {
    const state = deriveQuizState(session({
      finishedAt: "2026-06-07T00:01:00.000Z",
      attempts: [
        { id: 1, question: "Question 1?", correct: true, choice: "A", createdAt: "" },
        { id: 2, question: "Question 2?", correct: false, choice: "B", createdAt: "" },
        { id: 3, question: "Question 3?", correct: true, choice: "A", createdAt: "" },
      ],
    }));

    expect(state.status).toBe("finished");
    expect(state.answeredCount).toBe(3);
    expect(state.answered.map((a) => a.question)).toEqual([
      "Question 1?",
      "Question 2?",
      "Question 3?",
    ]);
    expect(state.current).toBeNull();
    expect(state.scorePercent).toBe(67);
  });
});

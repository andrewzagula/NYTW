import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PerseusResult } from "@/lib/perseus";
import type { GeneratedQuizQuestion } from "./generator";

const queryIndex = vi.fn<(q: string, topK?: number) => Promise<PerseusResult>>();

vi.mock("@/lib/perseus", () => ({
  queryIndex: (q: string, topK?: number) => queryIndex(q, topK),
}));

// Imported after the mock is registered.
const { groundQuizWithPerseus } = await import("./grounding");

function question(text: string): GeneratedQuizQuestion {
  return {
    question: text,
    expectedAnswer: "answer",
    explanation: "why",
    contextSummary: null,
    snippets: [],
  };
}

describe("groundQuizWithPerseus", () => {
  beforeEach(() => queryIndex.mockReset());

  it("attaches perseus hits as snippets per question", async () => {
    queryIndex.mockResolvedValue({
      answer: null,
      hits: [
        {
          path: "utils/grade-calculator.ts",
          lineStart: 99,
          lineEnd: 101,
          snippet: "function getAssignmentEarnedPoints() {}",
          score: 0.9,
          kind: "function",
          symbol: "getAssignmentEarnedPoints",
          signature: "getAssignmentEarnedPoints (assignment)",
        },
      ],
    });

    const [grounded] = await groundQuizWithPerseus([question("How are points earned?")]);
    expect(grounded.snippets).toEqual([
      {
        path: "utils/grade-calculator.ts",
        lineStart: 99,
        lineEnd: 101,
        snippet: "function getAssignmentEarnedPoints() {}",
      },
    ]);
  });

  it("queries perseus once per question", async () => {
    queryIndex.mockResolvedValue({ answer: null, hits: [] });
    await groundQuizWithPerseus([question("q1"), question("q2"), question("q3")]);
    expect(queryIndex).toHaveBeenCalledTimes(3);
    expect(queryIndex).toHaveBeenCalledWith("q1", 3);
  });

  it("leaves a question's snippets untouched when perseus returns no hits", async () => {
    queryIndex.mockResolvedValue({ answer: null, hits: [] });
    const [grounded] = await groundQuizWithPerseus([question("no hits")]);
    expect(grounded.snippets).toEqual([]);
  });
});

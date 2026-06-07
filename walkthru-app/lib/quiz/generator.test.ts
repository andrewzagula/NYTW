import { describe, expect, it } from "vitest";
import { parseGeneratedQuiz } from "./generator";

describe("parseGeneratedQuiz", () => {
  it("parses valid quiz JSON", () => {
    const questions = parseGeneratedQuiz(JSON.stringify({
      questions: [
        {
          question: "Why does this commit change the cache eviction policy?",
          expectedAnswer: "It avoids unbounded growth while keeping recently used entries available.",
          explanation: "This checks that the author understands the behavior change, not just the code edit.",
          contextSummary: "Cache policy changed.",
          snippets: [{ path: "src/cache.ts", lineStart: 10, lineEnd: 20, snippet: "class LruCache {}" }],
        },
        {
          question: "What caller behavior could change?",
          expectedAnswer: "Callers may see recomputation after eviction.",
          explanation: "The question surfaces downstream effects.",
        },
        {
          question: "What should be monitored after release?",
          expectedAnswer: "Hit rate, memory usage, and latency.",
          explanation: "The question checks operational awareness.",
        },
      ],
    }));

    expect(questions).toHaveLength(3);
    expect(questions[0]).toEqual({
      question: "Why does this commit change the cache eviction policy?",
      expectedAnswer: "It avoids unbounded growth while keeping recently used entries available.",
      explanation: "This checks that the author understands the behavior change, not just the code edit.",
      contextSummary: "Cache policy changed.",
      snippets: [{ path: "src/cache.ts", lineStart: 10, lineEnd: 20, snippet: "class LruCache {}" }],
    });
  });

  it("parses JSON from a fenced block", () => {
    const questions = parseGeneratedQuiz(`\`\`\`json
{
  "questions": [
    {"question":"Q1?","expectedAnswer":"A1","explanation":"E1"},
    {"question":"Q2?","expectedAnswer":"A2","explanation":"E2"},
    {"question":"Q3?","expectedAnswer":"A3","explanation":"E3"}
  ]
}
\`\`\``);

    expect(questions.map((q) => q.question)).toEqual(["Q1?", "Q2?", "Q3?"]);
  });

  it("tolerates trailing commas in the model output", () => {
    const questions = parseGeneratedQuiz(`{
  "questions": [
    {"question":"Q1, with a comma?","expectedAnswer":"A1","explanation":"E1",},
    {"question":"Q2?","expectedAnswer":"A2","explanation":"E2"},
    {"question":"Q3?","expectedAnswer":"A3","explanation":"E3"},
  ],
}`);

    expect(questions.map((q) => q.question)).toEqual(["Q1, with a comma?", "Q2?", "Q3?"]);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseGeneratedQuiz("not json")).toThrow();
  });

  it("rejects the wrong number of questions", () => {
    expect(() => parseGeneratedQuiz(JSON.stringify({
      questions: [
        { question: "Q1?", expectedAnswer: "A1", explanation: "E1" },
        { question: "Q2?", expectedAnswer: "A2", explanation: "E2" },
      ],
    }))).toThrow("3-5");
  });

  it("rejects missing required fields", () => {
    expect(() => parseGeneratedQuiz(JSON.stringify({
      questions: [
        { question: "Q1?", expectedAnswer: "A1", explanation: "E1" },
        { question: "Q2?", expectedAnswer: "A2", explanation: "E2" },
        { question: "Q3?", explanation: "E3" },
      ],
    }))).toThrow("missing required fields");
  });
});

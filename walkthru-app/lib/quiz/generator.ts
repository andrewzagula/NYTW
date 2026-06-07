import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { QuizSnippet } from "@/lib/db";

const MODEL = process.env.WALKTHRU_QUIZ_MODEL ?? "claude-opus-4-8";
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 5;

export type NewCommitPayload = {
  commitDescription: string;
  commitMessage?: string;
  commitId?: string;
  commitSha?: string;
  repository?: string;
  branch?: string;
  remoteUrl?: string;
  diff?: string;
  source?: "manual" | "post-commit" | "pre-push";
};

export type GeneratedQuizQuestion = {
  question: string;
  expectedAnswer: string;
  explanation: string;
  contextSummary?: string | null;
  snippets?: QuizSnippet[];
};

type RawQuizQuestion = {
  question?: unknown;
  expectedAnswer?: unknown;
  expected_answer?: unknown;
  explanation?: unknown;
  contextSummary?: unknown;
  context_summary?: unknown;
  snippets?: unknown;
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSnippets(value: unknown): QuizSnippet[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const path = asOptionalString(raw.path);
    const snippet = asOptionalString(raw.snippet);
    if (!path || !snippet) return [];

    return [{
      path,
      lineStart: typeof raw.lineStart === "number" ? raw.lineStart : null,
      lineEnd: typeof raw.lineEnd === "number" ? raw.lineEnd : null,
      snippet,
    }];
  });
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) return JSON.parse(fenced[1]);

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Quiz generation did not return JSON.");
  }
}

export function parseGeneratedQuiz(text: string): GeneratedQuizQuestion[] {
  const data = extractJson(text);
  if (!data || typeof data !== "object") {
    throw new Error("Quiz generation returned a non-object JSON value.");
  }

  const questions = (data as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw new Error("Quiz generation JSON must include a questions array.");
  }
  if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
    throw new Error("Quiz generation must return 3-5 questions.");
  }

  return questions.map((rawQuestion, index) => {
    if (!rawQuestion || typeof rawQuestion !== "object") {
      throw new Error(`Question ${index + 1} is not an object.`);
    }

    const raw = rawQuestion as RawQuizQuestion;
    const question = asOptionalString(raw.question);
    const expectedAnswer = asOptionalString(raw.expectedAnswer) ?? asOptionalString(raw.expected_answer);
    const explanation = asOptionalString(raw.explanation);
    const contextSummary = asOptionalString(raw.contextSummary) ?? asOptionalString(raw.context_summary) ?? null;

    if (!question || !expectedAnswer || !explanation) {
      throw new Error(`Question ${index + 1} is missing required fields.`);
    }

    return {
      question,
      expectedAnswer,
      explanation,
      contextSummary,
      snippets: normalizeSnippets(raw.snippets),
    };
  });
}

function truncate(value: string | undefined, maxLength: number): string {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n\n[truncated]`;
}

function buildPrompt(payload: NewCommitPayload): string {
  return [
    "Generate a Walkthru comprehension quiz for a single git commit.",
    "",
    "Return only strict JSON in this exact shape:",
    `{"questions":[{"question":"...","expectedAnswer":"...","explanation":"...","contextSummary":null,"snippets":[]}]}`,
    "",
    "Rules:",
    "- Generate 3 to 5 questions.",
    "- Questions must test understanding of intent, risks, edge cases, or downstream behavior.",
    "- Do not ask questions that can be answered by simply repeating the commit message.",
    "- Keep each question concise.",
    "- expectedAnswer should be the answer a strong engineer should give.",
    "- explanation should explain why the question matters.",
    "- Leave snippets as [] for now; Perseus grounding will populate snippets later.",
    "",
    "Commit metadata:",
    `Repository: ${payload.repository ?? "unknown"}`,
    `Branch: ${payload.branch ?? "unknown"}`,
    `Commit SHA: ${payload.commitSha ?? payload.commitId ?? "unknown"}`,
    `Source: ${payload.source ?? "unknown"}`,
    `Subject: ${payload.commitMessage ?? "none"}`,
    "",
    "Commit description:",
    truncate(payload.commitDescription, 8_000),
    "",
    "Diff, if available:",
    truncate(payload.diff, 40_000) || "No diff provided.",
  ].join("\n");
}

export async function generateCommitQuiz(
  payload: NewCommitPayload
): Promise<GeneratedQuizQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const result = await generateText({
    model: anthropic(MODEL),
    prompt: buildPrompt(payload),
  });

  return parseGeneratedQuiz(result.text);
}

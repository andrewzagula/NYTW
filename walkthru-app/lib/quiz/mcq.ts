import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const MODEL = process.env.WALKTHRU_QUIZ_MODEL ?? "claude-opus-4-8";
const MAX_DIFF_CHARS = 16_000;

export type Difficulty = "easy" | "medium" | "hard";
export type Choice = "A" | "B" | "C" | "D";

export type McqOptions = { A: string; B: string; C: string; D: string };

export type McqQuestion = {
  questionId: string;
  question: string;
  options: McqOptions;
  correctAnswer: Choice;
  explanation: string;
  difficulty: Difficulty;
};

export type McqGenInput = {
  commitMessage?: string | null;
  commitSha?: string | null;
  repo?: string | null;
  diff?: string | null;
};

const SYSTEM = `You write multiple-choice comprehension questions for developers reviewing a git commit.
Questions must be directly answerable from the diff.

Output format is STRICT:
- Reply with raw JSON only. No prose before or after. No commentary. No markdown fences.
- The reply MUST start with the opening bracket of the JSON value and end with its matching closing bracket.
- Do not include trailing notes, suggestions, or explanations outside the JSON.`;

function truncate(text: string | null | undefined, max = MAX_DIFF_CHARS): string {
  if (!text) return "(no diff available)";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[truncated]`;
}

function buildInitialPrompt(input: McqGenInput, difficulty: Difficulty, count: number): string {
  return [
    `Generate exactly ${count} ${difficulty} multiple-choice questions about the git commit below.`,
    "",
    "REQUIREMENTS:",
    "- Every question MUST reference specific code visible in the diff (a function name, file name, field, condition, return value, etc.).",
    "- Do NOT ask generic questions answerable without reading the diff.",
    "- Wrong options must be plausible — based on lines that ARE in the diff but don't answer the question.",
    "- The explanation should cite the specific line(s) in the diff that justify the answer.",
    "",
    "Difficulty guide:",
    '  - easy   : direct recall — name a function, file, value, or addition shown in the diff',
    '  - medium : intent and behavior — what the change does, why it was made',
    '  - hard   : implications — risks, edge cases, downstream effects of the change',
    "",
    "Return strict JSON: an array of question objects with this exact shape:",
    `[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct_answer":"A","explanation":"why A is correct, citing diff lines"}]`,
    "Each `correct_answer` must be one of \"A\",\"B\",\"C\",\"D\".",
    "",
    `Repository: ${input.repo ?? "unknown"}`,
    `Commit SHA: ${input.commitSha ?? "unknown"}`,
    `Commit message: ${input.commitMessage ?? "none"}`,
    "",
    "Diff (unified format, one block per file):",
    truncate(input.diff),
  ].join("\n");
}

function buildFollowUpPrompt(
  input: McqGenInput,
  parent: McqQuestion,
  difficulty: Difficulty,
): string {
  return [
    `The developer answered the following question INCORRECTLY:`,
    `Q: ${parent.question}`,
    `Options: ${JSON.stringify(parent.options)}`,
    `Correct answer was: ${parent.correctAnswer} — ${parent.options[parent.correctAnswer]}`,
    "",
    `Generate exactly 1 ${difficulty} multiple-choice question that probes the same concept at a more accessible level.`,
    "REQUIREMENTS:",
    "- Reference specific code in the diff below (function/file/value).",
    "- Help reveal whether the developer understands the underlying idea from the parent question.",
    "",
    "Return strict JSON — a SINGLE object (not an array):",
    `{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct_answer":"A","explanation":"why A is correct, citing diff lines"}`,
    "",
    `Repository: ${input.repo ?? "unknown"}`,
    `Commit SHA: ${input.commitSha ?? "unknown"}`,
    `Commit message: ${input.commitMessage ?? "none"}`,
    "",
    "Diff (unified format, one block per file):",
    truncate(input.diff),
  ].join("\n");
}

/**
 * Find the first balanced JSON value (object or array) in `text` and return it.
 * Walks bracket depth while respecting string literals + escape sequences,
 * so trailing prose after the JSON is tolerated.
 */
function findBalancedJson(text: string): string | null {
  let start = -1;
  let opener: "[" | "{" | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "[" || c === "{") {
      start = i;
      opener = c as "[" | "{";
      break;
    }
  }
  if (start === -1 || !opener) return null;

  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) {
        // Closer must match opener — if mismatched, the slice is malformed
        // anyway and JSON.parse will throw.
        if (c !== closer) return null;
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // fall through to balanced extraction
      }
    }
    const slice = findBalancedJson(trimmed);
    if (slice) return JSON.parse(slice);
    throw new Error("Model did not return JSON.");
  }
}

function validateRaw(raw: unknown, index: number, difficulty: Difficulty): McqQuestion {
  if (!raw || typeof raw !== "object") throw new Error(`Q${index} not an object`);
  const r = raw as Record<string, unknown>;
  const question = typeof r.question === "string" ? r.question.trim() : "";
  const options = r.options as Record<string, unknown> | undefined;
  const correct = (r.correct_answer ?? r.correctAnswer) as string | undefined;
  const explanation = typeof r.explanation === "string" ? r.explanation.trim() : "";
  if (!question) throw new Error(`Q${index} missing question`);
  if (!options || !["A", "B", "C", "D"].every((k) => typeof options[k] === "string")) {
    throw new Error(`Q${index} options invalid`);
  }
  if (!correct || !["A", "B", "C", "D"].includes(correct.toUpperCase())) {
    throw new Error(`Q${index} correct_answer invalid`);
  }
  return {
    questionId: `q${index}`,
    question,
    options: {
      A: String(options.A),
      B: String(options.B),
      C: String(options.C),
      D: String(options.D),
    },
    correctAnswer: correct.toUpperCase() as Choice,
    explanation: explanation || "",
    difficulty,
  };
}

export async function generateInitialMcqs(
  input: McqGenInput,
  opts: { difficulty?: Difficulty; count?: number } = {},
): Promise<McqQuestion[]> {
  const difficulty = opts.difficulty ?? "medium";
  const count = opts.count ?? 3;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const result = await generateText({
    model: anthropic(MODEL),
    system: SYSTEM,
    prompt: buildInitialPrompt(input, difficulty, count),
  });

  const parsed = extractJson(result.text);
  const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] }).questions;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Generator returned no questions.");
  }
  return list.slice(0, count).map((q, i) => validateRaw(q, i + 1, difficulty));
}

export async function generateFollowUpMcq(
  input: McqGenInput,
  parent: McqQuestion,
  opts: { difficulty?: Difficulty } = {},
): Promise<McqQuestion> {
  const difficulty = opts.difficulty ?? "easy";

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const result = await generateText({
    model: anthropic(MODEL),
    system: SYSTEM,
    prompt: buildFollowUpPrompt(input, parent, difficulty),
  });

  const parsed = extractJson(result.text);
  const obj = Array.isArray(parsed) ? parsed[0] : parsed;
  return validateRaw(obj, 1, difficulty);
}

export function gradeMcq(question: { correctAnswer: Choice }, choice: string): boolean {
  return question.correctAnswer === String(choice).trim().toUpperCase();
}

"use strict";

/**
 * Module — Question Generation via Anthropic API.
 *
 * Generates 5 questions for a quiz session given the git diff and chosen mode.
 * Called once at session start; the returned questions are shown one at a time.
 *
 * Each mode produces a different question shape:
 *   MCQ      — { question, options: string[4], correct_answer, perseus_query }
 *   Matching — { question, pairs: {left, right}[], correct_answer: {}, perseus_query }
 *   FRQ      — { question, rubric, perseus_query }
 *
 * All questions include a `perseus_query` string so the caller can run
 * queryPerseus() before showing the question to the user.
 */

const { ANTHROPIC_MODEL, ANTHROPIC_BASE_URL } = require("./config");
const { callAnthropic } = require("./frq");

const VALID_MODES = ["mcq", "matching", "frq"];

const GEN_SYSTEM = `You are generating code comprehension quiz questions for a developer reviewing their own git diff.
Questions must be directly answerable from the diff and surrounding codebase.
Return JSON only — no preamble, no markdown fences.`;

const MODE_FORMATS = {
  mcq: `Each question must have exactly 4 options (A, B, C, D). correct_answer is one of "A","B","C","D".
Format per question:
{
  "question_id": "q1",
  "type": "mcq",
  "question": "...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct_answer": "A",
  "perseus_query": "short phrase to search the codebase for evidence"
}`,

  matching: `Each question presents 3-4 left-side items to match to right-side items.
correct_answer is an object mapping each left key to its right value.
Format per question:
{
  "question_id": "q1",
  "type": "matching",
  "question": "Match each item on the left to its correct pair on the right.",
  "pairs": [
    { "left": "...", "right": "..." },
    { "left": "...", "right": "..." }
  ],
  "correct_answer": { "left-item-1": "right-item-1", "left-item-2": "right-item-2" },
  "perseus_query": "short phrase to search the codebase for evidence"
}`,

  frq: `Each question is open-ended — the developer types a conversational answer.
Include a rubric for scoring (not shown to the developer).
Format per question:
{
  "question_id": "q1",
  "type": "frq",
  "question": "...",
  "rubric": "What a correct answer must address: ...",
  "perseus_query": "short phrase to search the codebase for evidence"
}`,
};

/**
 * Build the generation prompt.
 * @param {string} diff
 * @param {"mcq"|"matching"|"frq"} mode
 * @returns {string}
 */
function buildGenPrompt(diff, mode) {
  return `Generate exactly 5 ${mode.toUpperCase()} questions about this git diff.
Questions should test genuine code comprehension — what changed, why, and implications.

${MODE_FORMATS[mode]}

Return a JSON array of exactly 5 question objects: [ {...}, {...}, {...}, {...}, {...} ]

Git diff:
${diff || "(empty diff)"}`;
}

/**
 * Parse the generation response into a validated array of 5 questions.
 * @param {string} text
 * @param {"mcq"|"matching"|"frq"} mode
 * @returns {object[]}
 */
function parseGenResponse(text, mode) {
  const stripped = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  const parsed = JSON.parse(stripped);
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list) || list.length === 0) throw new Error("no questions array in response");

  // Normalize and validate each question.
  return list.slice(0, 5).map((q, i) => {
    const base = {
      question_id: q.question_id || `q${i + 1}`,
      type: mode,
      question: String(q.question || ""),
      perseus_query: String(q.perseus_query || q.question || ""),
    };
    if (mode === "mcq") {
      return { ...base, options: q.options || {}, correct_answer: q.correct_answer || "A" };
    }
    if (mode === "matching") {
      return { ...base, pairs: Array.isArray(q.pairs) ? q.pairs : [], correct_answer: q.correct_answer || {} };
    }
    // frq
    return { ...base, rubric: String(q.rubric || "") };
  });
}

/**
 * Generate 5 quiz questions for the given diff and mode.
 *
 * @param {object} params
 * @param {string} params.diff          Git diff (from getStagedDiff or similar).
 * @param {"mcq"|"matching"|"frq"} params.mode
 * @param {object} [options]
 * @param {Function} [options.callLlm]  Replaces the HTTP call (for testing).
 * @param {string} [options.model]
 * @param {number} [options.maxTokens]  Default 2000 (questions need more space).
 * @returns {Promise<{ questions: object[], error?: string }>}
 */
async function generateQuestions(params, options = {}) {
  const { diff, mode } = params;

  if (!VALID_MODES.includes(mode)) {
    return { questions: [], error: `invalid mode: ${mode}. Must be one of ${VALID_MODES.join(", ")}` };
  }

  const prompt = buildGenPrompt(diff || "", mode);

  let text;
  try {
    const caller = options.callLlm || callAnthropic;
    text = await caller(prompt, { maxTokens: options.maxTokens || 2000, ...options });
  } catch (e) {
    return { questions: [], error: `generation failed: ${e.message}` };
  }

  try {
    const questions = parseGenResponse(text, mode);
    return { questions };
  } catch (e) {
    return { questions: [], error: `parse failed: ${e.message}` };
  }
}

module.exports = { generateQuestions, buildGenPrompt, parseGenResponse };

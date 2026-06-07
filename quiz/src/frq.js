"use strict";

/**
 * Module — FRQ Evaluation via Anthropic API.
 *
 * Sends { question, user_answer, perseus_evidence } to Claude and gets back
 * { score: "correct|partial|incorrect", explanation } as JSON.
 *
 * The caller is responsible for running queryPerseus() first and passing the
 * evidence in. The chatbot interface stays open after scoring for follow-ups —
 * this module only handles the evaluation call, not the chat session.
 */

const { ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS, ANTHROPIC_BASE_URL } = require("./config");

const EVAL_SYSTEM = `You are evaluating a developer's understanding of their own code changes.
Be fair but precise. Return JSON only — no preamble, no markdown fences.`;

/**
 * Build the evaluation prompt.
 * @param {string} question
 * @param {string} userAnswer
 * @param {string} perseusEvidence
 * @returns {string}
 */
function buildEvalPrompt(question, userAnswer, perseusEvidence) {
  return `Question asked to the developer:
${question}

Relevant code evidence (from Perseus codebase search):
${perseusEvidence || "(no evidence available)"}

Developer's answer:
${userAnswer}

Evaluate correctness and return JSON only:
{
  "score": "correct | partial | incorrect",
  "explanation": "1-2 sentence explanation"
}

Scoring guide:
- correct: answer clearly and accurately addresses the code behavior
- partial: answer shows real understanding but misses key details or is imprecise
- incorrect: answer is wrong, irrelevant, or shows no code understanding`;
}

/**
 * Call the Anthropic Messages API.
 * @param {string} userPrompt
 * @param {object} [options]
 * @param {string} [options.apiKey]   Overrides ANTHROPIC_API_KEY env.
 * @param {string} [options.model]    Overrides config model.
 * @param {number} [options.maxTokens]
 * @returns {Promise<string>}  Raw text from the first content block.
 */
async function callAnthropic(userPrompt, options = {}) {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const model = options.model || ANTHROPIC_MODEL;
  const max_tokens = options.maxTokens || ANTHROPIC_MAX_TOKENS;
  const baseUrl = options.baseUrl || ANTHROPIC_BASE_URL;

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system: EVAL_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.content?.[0]?.text;
  if (!text) throw new Error("empty Anthropic response");
  return text;
}

/**
 * Parse the LLM evaluation response.
 * @param {string} text
 * @returns {{ score: "correct"|"partial"|"incorrect", explanation: string }}
 */
function parseEvalResponse(text) {
  const stripped = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  const parsed = JSON.parse(stripped);
  const score = String(parsed.score || "").trim().toLowerCase();
  if (!["correct", "partial", "incorrect"].includes(score)) {
    throw new Error(`invalid score value: ${parsed.score}`);
  }
  return { score, explanation: String(parsed.explanation || "") };
}

/**
 * Evaluate a FRQ answer via the Anthropic API.
 *
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.user_answer
 * @param {string} [params.perseus_evidence]
 * @param {object} [options]
 * @param {Function} [options.callLlm]  Replaces the HTTP call (for testing).
 * @returns {Promise<{ score: string, explanation: string, error?: string }>}
 */
async function evaluateFrq(params, options = {}) {
  const { question, user_answer, perseus_evidence = "" } = params;
  const prompt = buildEvalPrompt(question, user_answer, perseus_evidence);

  let text;
  try {
    const caller = options.callLlm || callAnthropic;
    text = await caller(prompt, options);
  } catch (e) {
    // Degrade gracefully — score as incorrect rather than blocking the quiz.
    return { score: "incorrect", explanation: "", error: `evaluation failed: ${e.message}` };
  }

  try {
    return parseEvalResponse(text);
  } catch (e) {
    return { score: "incorrect", explanation: text.slice(0, 200), error: `parse failed: ${e.message}` };
  }
}

module.exports = { evaluateFrq, buildEvalPrompt, parseEvalResponse, callAnthropic };

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGenPrompt, parseGenResponse, generateQuestions } = require("../src/questions");

const MCQ_FIXTURE = JSON.stringify([
  { question_id: "q1", type: "mcq", question: "What does the timeout constant control?", options: { A: "Request timeout", B: "Retry delay", C: "Cache TTL", D: "Batch size" }, correct_answer: "A", perseus_query: "timeout constant" },
  { question_id: "q2", type: "mcq", question: "Which function uses the constant?", options: { A: "fetch", B: "init", C: "retry", D: "parse" }, correct_answer: "C", perseus_query: "retry function" },
  { question_id: "q3", type: "mcq", question: "What file was changed?", options: { A: "config.js", B: "index.js", C: "api.js", D: "utils.js" }, correct_answer: "A", perseus_query: "config file" },
  { question_id: "q4", type: "mcq", question: "What was the old value?", options: { A: "3000", B: "5000", C: "10000", D: "30000" }, correct_answer: "B", perseus_query: "old timeout" },
  { question_id: "q5", type: "mcq", question: "Why was it changed?", options: { A: "Bug fix", B: "Performance", C: "Compliance", D: "Refactor" }, correct_answer: "A", perseus_query: "timeout reason" },
]);

const FRQ_FIXTURE = JSON.stringify([
  { question_id: "q1", type: "frq", question: "Explain why the timeout was increased.", rubric: "Must mention retry logic and downstream impact.", perseus_query: "timeout increase" },
  { question_id: "q2", type: "frq", question: "What callers are affected by this change?", rubric: "Must identify retryRequest and fetchWithTimeout.", perseus_query: "callers of timeout" },
  { question_id: "q3", type: "frq", question: "What risk does this introduce?", rubric: "Should mention slower failure detection.", perseus_query: "timeout risk" },
  { question_id: "q4", type: "frq", question: "How would you test this change?", rubric: "Unit test with mocked timer and integration test.", perseus_query: "test timeout" },
  { question_id: "q5", type: "frq", question: "Is this a breaking change?", rubric: "No — same interface, callers unaffected at compile time.", perseus_query: "breaking change" },
]);

const MATCHING_FIXTURE = JSON.stringify([
  { question_id: "q1", type: "matching", question: "Match each function to its file.", pairs: [{ left: "retryRequest", right: "api.js" }, { left: "fetchWithTimeout", right: "utils.js" }], correct_answer: { retryRequest: "api.js", fetchWithTimeout: "utils.js" }, perseus_query: "function locations" },
  { question_id: "q2", type: "matching", question: "Match constants to values.", pairs: [{ left: "TIMEOUT_MS", right: "5000" }, { left: "MAX_RETRIES", right: "3" }], correct_answer: { TIMEOUT_MS: "5000", MAX_RETRIES: "3" }, perseus_query: "constant values" },
  { question_id: "q3", type: "matching", question: "Q3", pairs: [], correct_answer: {}, perseus_query: "q3" },
  { question_id: "q4", type: "matching", question: "Q4", pairs: [], correct_answer: {}, perseus_query: "q4" },
  { question_id: "q5", type: "matching", question: "Q5", pairs: [], correct_answer: {}, perseus_query: "q5" },
]);

// --- buildGenPrompt ---
test("buildGenPrompt includes mode and diff", () => {
  const p = buildGenPrompt("diff --git a/foo.js", "mcq");
  assert.match(p, /MCQ/);
  assert.match(p, /diff --git a\/foo\.js/);
});

test("buildGenPrompt mentions FRQ format for frq mode", () => {
  const p = buildGenPrompt("", "frq");
  assert.match(p, /rubric/i);
  assert.match(p, /FRQ/);
});

test("buildGenPrompt mentions pairs for matching mode", () => {
  const p = buildGenPrompt("", "matching");
  assert.match(p, /pairs/i);
});

// --- parseGenResponse ---
test("parseGenResponse parses MCQ fixture into 5 questions", () => {
  const qs = parseGenResponse(MCQ_FIXTURE, "mcq");
  assert.equal(qs.length, 5);
  assert.equal(qs[0].type, "mcq");
  assert.equal(qs[0].correct_answer, "A");
  assert.ok(qs[0].options);
});

test("parseGenResponse parses FRQ fixture", () => {
  const qs = parseGenResponse(FRQ_FIXTURE, "frq");
  assert.equal(qs.length, 5);
  assert.equal(qs[0].type, "frq");
  assert.ok(qs[0].rubric);
  assert.ok(qs[0].perseus_query);
});

test("parseGenResponse parses Matching fixture", () => {
  const qs = parseGenResponse(MATCHING_FIXTURE, "matching");
  assert.equal(qs.length, 5);
  assert.equal(qs[0].type, "matching");
  assert.deepEqual(qs[0].correct_answer, { retryRequest: "api.js", fetchWithTimeout: "utils.js" });
});

test("parseGenResponse strips markdown code fences", () => {
  const raw = "```json\n" + MCQ_FIXTURE + "\n```";
  const qs = parseGenResponse(raw, "mcq");
  assert.equal(qs.length, 5);
});

test("parseGenResponse caps at 5 even if LLM returns more", () => {
  const extra = JSON.parse(MCQ_FIXTURE);
  extra.push({ ...extra[0], question_id: "q6" });
  const qs = parseGenResponse(JSON.stringify(extra), "mcq");
  assert.equal(qs.length, 5);
});

test("parseGenResponse accepts { questions: [...] } wrapper", () => {
  const wrapped = JSON.stringify({ questions: JSON.parse(FRQ_FIXTURE) });
  const qs = parseGenResponse(wrapped, "frq");
  assert.equal(qs.length, 5);
});

test("parseGenResponse throws on empty array", () => {
  assert.throws(() => parseGenResponse("[]", "mcq"));
});

// --- generateQuestions ---
test("generateQuestions rejects invalid mode", async () => {
  const r = await generateQuestions({ diff: "", mode: "essay" });
  assert.equal(r.questions.length, 0);
  assert.match(r.error, /invalid mode/);
});

test("generateQuestions returns questions on success", async () => {
  const r = await generateQuestions(
    { diff: "diff --git a/config.js", mode: "frq" },
    { callLlm: async () => FRQ_FIXTURE },
  );
  assert.equal(r.questions.length, 5);
  assert.equal(r.error, undefined);
});

test("generateQuestions degrades gracefully on API failure", async () => {
  const r = await generateQuestions(
    { diff: "", mode: "mcq" },
    { callLlm: async () => { throw new Error("timeout"); } },
  );
  assert.equal(r.questions.length, 0);
  assert.match(r.error, /generation failed/);
});

test("generateQuestions degrades gracefully on bad JSON", async () => {
  const r = await generateQuestions(
    { diff: "", mode: "mcq" },
    { callLlm: async () => "not json" },
  );
  assert.equal(r.questions.length, 0);
  assert.match(r.error, /parse failed/);
});

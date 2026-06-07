"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEvalPrompt, parseEvalResponse, evaluateFrq } = require("../src/frq");
const { scoreFrq, scoreQuestion } = require("../src/scoring");

// --- buildEvalPrompt ---
test("buildEvalPrompt includes question, answer, and evidence", () => {
  const p = buildEvalPrompt("What does foo() do?", "It logs the value", "src/foo.js:5 — console.log(val)");
  assert.match(p, /What does foo\(\) do\?/);
  assert.match(p, /It logs the value/);
  assert.match(p, /src\/foo\.js:5/);
});

test("buildEvalPrompt handles missing evidence gracefully", () => {
  const p = buildEvalPrompt("Q?", "A", "");
  assert.match(p, /no evidence available/);
});

// --- parseEvalResponse ---
test("parseEvalResponse parses correct", () => {
  const r = parseEvalResponse(JSON.stringify({ score: "correct", explanation: "Great." }));
  assert.equal(r.score, "correct");
  assert.equal(r.explanation, "Great.");
});

test("parseEvalResponse parses partial", () => {
  const r = parseEvalResponse(JSON.stringify({ score: "partial", explanation: "Close." }));
  assert.equal(r.score, "partial");
});

test("parseEvalResponse parses incorrect", () => {
  const r = parseEvalResponse(JSON.stringify({ score: "incorrect", explanation: "Wrong." }));
  assert.equal(r.score, "incorrect");
});

test("parseEvalResponse strips markdown code fences", () => {
  const raw = "```json\n" + JSON.stringify({ score: "correct", explanation: "ok" }) + "\n```";
  const r = parseEvalResponse(raw);
  assert.equal(r.score, "correct");
});

test("parseEvalResponse throws on invalid score value", () => {
  assert.throws(() => parseEvalResponse(JSON.stringify({ score: "maybe", explanation: "" })));
});

// --- evaluateFrq ---
test("evaluateFrq returns parsed result on success", async () => {
  const r = await evaluateFrq(
    { question: "What does foo do?", user_answer: "logs stuff", perseus_evidence: "src/foo.js:1" },
    { callLlm: async () => JSON.stringify({ score: "partial", explanation: "Close but missing detail." }) },
  );
  assert.equal(r.score, "partial");
  assert.match(r.explanation, /Close/);
  assert.equal(r.error, undefined);
});

test("evaluateFrq degrades to incorrect on API failure", async () => {
  const r = await evaluateFrq(
    { question: "Q?", user_answer: "A" },
    { callLlm: async () => { throw new Error("timeout"); } },
  );
  assert.equal(r.score, "incorrect");
  assert.match(r.error, /evaluation failed/);
});

test("evaluateFrq degrades to incorrect on parse failure", async () => {
  const r = await evaluateFrq(
    { question: "Q?", user_answer: "A" },
    { callLlm: async () => "not valid json" },
  );
  assert.equal(r.score, "incorrect");
  assert.match(r.error, /parse failed/);
});

// --- scoreFrq ---
test("scoreFrq correct -> 1.0", () => {
  const r = scoreFrq({ evaluated_score: "correct" });
  assert.equal(r.score, 1.0);
  assert.equal(r.correct, true);
});

test("scoreFrq partial -> 0.5 with note", () => {
  const r = scoreFrq({ evaluated_score: "partial", explanation: "close" });
  assert.equal(r.score, 0.5);
  assert.equal(r.correct, false);
  assert.equal(r.note, "partial");
  assert.equal(r.explanation, "close");
});

test("scoreFrq incorrect -> 0.0", () => {
  const r = scoreFrq({ evaluated_score: "incorrect" });
  assert.equal(r.score, 0.0);
  assert.equal(r.correct, false);
});

test("scoreFrq missing evaluated_score -> 0.0 (safe default)", () => {
  const r = scoreFrq({});
  assert.equal(r.score, 0.0);
});

test("scoreQuestion dispatches FRQ type", () => {
  const r = scoreQuestion({ question_id: "q1", type: "frq", evaluated_score: "correct" });
  assert.equal(r.score, 1.0);
  assert.equal(r.question_id, "q1");
});

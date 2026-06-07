"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { decideCommit } = require("../src/commit-decision");
const { evaluateQuiz } = require("../src/index");

test("PASS at exactly the threshold (3.0) unlocks commit", () => {
  const d = decideCommit({ total: 3.0, passed: true });
  assert.deepEqual(d, {
    decision: "PASS",
    commit_allowed: true,
    show_review: false,
    retake_available: false,
    generate_review: false,
  });
});

test("FAIL below threshold blocks commit and signals review", () => {
  const d = decideCommit({ total: 2.5, passed: false });
  assert.deepEqual(d, {
    decision: "FAIL",
    commit_allowed: false,
    show_review: true,
    retake_available: true,
    generate_review: true,
  });
});

test("decideCommit derives pass from total when passed flag absent", () => {
  assert.equal(decideCommit({ total: 4 }).decision, "PASS");
  assert.equal(decideCommit({ total: 1 }).decision, "FAIL");
});

test("missing/garbage score object fails safe (blocked)", () => {
  const d = decideCommit(undefined);
  assert.equal(d.decision, "FAIL");
  assert.equal(d.commit_allowed, false);
});

test("evaluateQuiz wires scoring -> decision end to end", () => {
  const { score, decision } = evaluateQuiz([
    { type: "mcq", correct_answer: "A", user_answer: "A" },
    { type: "mcq", correct_answer: "A", user_answer: "A" },
    { type: "mcq", correct_answer: "A", user_answer: "A" },
    { type: "mcq", correct_answer: "A", user_answer: "B" },
    { type: "mcq", correct_answer: "A", user_answer: "B" },
  ]);
  assert.equal(score.total, 3.0);
  assert.equal(decision.decision, "PASS");
  assert.equal(decision.commit_allowed, true);
});

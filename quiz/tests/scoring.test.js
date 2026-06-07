"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreQuiz, scoreQuestion } = require("../src/scoring");

test("MCQ correct scores 1.0", () => {
  const r = scoreQuestion({ question_id: "q1", type: "mcq", correct_answer: "B", user_answer: "B" });
  assert.equal(r.score, 1.0);
  assert.equal(r.correct, true);
});

test("MCQ incorrect scores 0.0", () => {
  const r = scoreQuestion({ question_id: "q1", type: "mcq", correct_answer: "B", user_answer: "C" });
  assert.equal(r.score, 0.0);
  assert.equal(r.correct, false);
});

test("MCQ comparison is case/space-insensitive", () => {
  const r = scoreQuestion({ type: "mcq", correct_answer: "B", user_answer: " b " });
  assert.equal(r.score, 1.0);
});

test("Matching all pairs correct scores 1.0", () => {
  const r = scoreQuestion({
    type: "matching",
    correct_answer: { a: "1", b: "2", c: "3" },
    user_answer: { a: "1", b: "2", c: "3" },
  });
  assert.equal(r.score, 1.0);
  assert.equal(r.correct, true);
});

test("Matching some pairs correct scores 0.5 with partial note", () => {
  const r = scoreQuestion({
    type: "matching",
    correct_answer: { a: "1", b: "2", c: "3" },
    user_answer: { a: "1", b: "X", c: "Y" },
  });
  assert.equal(r.score, 0.5);
  assert.equal(r.correct, false);
  assert.equal(r.note, "partial");
});

test("Matching all wrong scores 0.0", () => {
  const r = scoreQuestion({
    type: "matching",
    correct_answer: { a: "1", b: "2" },
    user_answer: { a: "9", b: "9" },
  });
  assert.equal(r.score, 0.0);
});

test("Matching accepts array-of-pairs form", () => {
  const r = scoreQuestion({
    type: "matching",
    correct_answer: [["a", "1"], ["b", "2"]],
    user_answer: [["a", "1"], ["b", "2"]],
  });
  assert.equal(r.score, 1.0);
});

test("unknown question type scores 0.0", () => {
  const r = scoreQuestion({ type: "essay", correct_answer: "x", user_answer: "x" });
  assert.equal(r.score, 0.0);
});

test("scoreQuiz aggregates total and pass flag (>= 3.0 passes)", () => {
  const quiz = scoreQuiz([
    { question_id: "q1", type: "mcq", correct_answer: "A", user_answer: "A" }, // 1.0
    { question_id: "q2", type: "matching", correct_answer: { a: "1", b: "2" }, user_answer: { a: "1", b: "X" } }, // 0.5
    { question_id: "q3", type: "mcq", correct_answer: "A", user_answer: "A" }, // 1.0
    { question_id: "q4", type: "mcq", correct_answer: "A", user_answer: "B" }, // 0.0
    { question_id: "q5", type: "mcq", correct_answer: "A", user_answer: "A" }, // 1.0
  ]);
  assert.deepEqual(quiz.scores, [1.0, 0.5, 1.0, 0.0, 1.0]);
  assert.equal(quiz.total, 3.5);
  assert.equal(quiz.passed, true);
  assert.equal(quiz.breakdown.length, 5);
});

test("scoreQuiz fails below threshold", () => {
  const quiz = scoreQuiz([
    { type: "mcq", correct_answer: "A", user_answer: "A" }, // 1.0
    { type: "mcq", correct_answer: "A", user_answer: "B" }, // 0.0
    { type: "mcq", correct_answer: "A", user_answer: "B" }, // 0.0
  ]);
  assert.equal(quiz.total, 1.0);
  assert.equal(quiz.passed, false);
});

test("partial-score total has no float drift", () => {
  const quiz = scoreQuiz([
    { type: "matching", correct_answer: { a: "1", b: "2" }, user_answer: { a: "1", b: "X" } },
    { type: "matching", correct_answer: { a: "1", b: "2" }, user_answer: { a: "1", b: "X" } },
    { type: "matching", correct_answer: { a: "1", b: "2" }, user_answer: { a: "1", b: "X" } },
  ]);
  assert.equal(quiz.total, 1.5);
});

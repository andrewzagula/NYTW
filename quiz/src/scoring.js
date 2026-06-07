"use strict";

/**
 * Module 2 — Scoring Logic (PRD §Module 2).
 *
 * Pure functions, no I/O. Given the per-question payloads from the frontend,
 * produce per-question scores and a quiz total.
 *
 * Scoring rules:
 *   MCQ       correct -> 1.0,  incorrect -> 0.0
 *   Matching  all pairs correct -> 1.0,  some -> 0.5,  none -> 0.0
 */

const { POINTS, PASS_THRESHOLD } = require("./config");

/**
 * Normalize a matching answer into a Map<leftKey, rightValue>.
 * Accepts either an object ({a: "1"}) or an array of pairs ([["a","1"]]).
 * @param {Object|Array} answer
 * @returns {Map<string,string>}
 */
function toPairMap(answer) {
  const map = new Map();
  if (Array.isArray(answer)) {
    for (const pair of answer) {
      if (Array.isArray(pair) && pair.length >= 2) {
        map.set(String(pair[0]), String(pair[1]));
      }
    }
  } else if (answer && typeof answer === "object") {
    for (const [k, v] of Object.entries(answer)) {
      map.set(String(k), String(v));
    }
  }
  return map;
}

/**
 * Case-insensitive trimmed equality for MCQ option labels.
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function sameOption(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * Score a single MCQ question.
 * @param {{correct_answer: *, user_answer: *}} q
 * @returns {{score: number, correct: boolean}}
 */
function scoreMcq(q) {
  const correct = sameOption(q.correct_answer, q.user_answer);
  return {
    score: correct ? POINTS.MCQ_CORRECT : POINTS.MCQ_INCORRECT,
    correct,
  };
}

/**
 * Score a single Matching question by comparing pair maps.
 * @param {{correct_answer: *, user_answer: *}} q
 * @returns {{score: number, correct: boolean, note?: string}}
 */
function scoreMatching(q) {
  const correctPairs = toPairMap(q.correct_answer);
  const userPairs = toPairMap(q.user_answer);

  const total = correctPairs.size;
  if (total === 0) {
    return { score: POINTS.MATCHING_NONE, correct: false, note: "no correct pairs defined" };
  }

  let matched = 0;
  for (const [key, value] of correctPairs) {
    if (userPairs.has(key) && sameOption(userPairs.get(key), value)) {
      matched += 1;
    }
  }

  if (matched === total) {
    return { score: POINTS.MATCHING_ALL, correct: true };
  }
  if (matched === 0) {
    return { score: POINTS.MATCHING_NONE, correct: false };
  }
  return { score: POINTS.MATCHING_SOME, correct: false, note: "partial" };
}

/**
 * Score a single FRQ question using the pre-evaluated score from the LLM.
 * Expects q.evaluated_score: "correct" | "partial" | "incorrect".
 * @param {{evaluated_score: string, explanation?: string}} q
 * @returns {{score: number, correct: boolean, note?: string, explanation?: string}}
 */
function scoreFrq(q) {
  const s = String(q.evaluated_score || "").trim().toLowerCase();
  const explanation = q.explanation || undefined;
  if (s === "correct") return { score: POINTS.FRQ_CORRECT, correct: true, explanation };
  if (s === "partial") return { score: POINTS.FRQ_PARTIAL, correct: false, note: "partial", explanation };
  return { score: POINTS.FRQ_INCORRECT, correct: false, explanation };
}

/**
 * Score one question by dispatching on its type.
 * FRQ: expects q.evaluated_score from the LLM evaluation step.
 * MCQ/Matching: compares user_answer to correct_answer.
 * @param {{question_id?: string, type: "mcq"|"matching"|"frq", correct_answer:*, user_answer:*, evaluated_score?: string}} q
 * @returns {{question_id?: string, score: number, correct: boolean, note?: string}}
 */
function scoreQuestion(q) {
  const type = String(q.type || "").toLowerCase();
  let result;
  if (type === "mcq") {
    result = scoreMcq(q);
  } else if (type === "matching") {
    result = scoreMatching(q);
  } else if (type === "frq") {
    result = scoreFrq(q);
  } else {
    result = { score: 0.0, correct: false, note: `unknown type: ${q.type}` };
  }
  return { question_id: q.question_id, ...result };
}

/**
 * Score a full quiz.
 * @param {Array} questions
 * @returns {{scores:number[], total:number, passed:boolean, breakdown:Array}}
 */
function scoreQuiz(questions) {
  const list = Array.isArray(questions) ? questions : [];
  const breakdown = list.map(scoreQuestion);
  const scores = breakdown.map((b) => b.score);
  // Round to avoid float drift (0.5 + 0.5 + ... noise) in the displayed total.
  const total = Math.round(scores.reduce((a, b) => a + b, 0) * 100) / 100;
  return {
    scores,
    total,
    passed: total >= PASS_THRESHOLD,
    breakdown,
  };
}

module.exports = {
  scoreQuiz,
  scoreQuestion,
  scoreMcq,
  scoreMatching,
  scoreFrq,
  toPairMap,
};

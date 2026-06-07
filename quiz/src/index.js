"use strict";

/**
 * Awe's scope — public entry point.
 *
 * Wires the three modules into the pipeline the PRD describes:
 *   questions -> [Perseus] -> [Scoring] -> [Commit decision] -> frontend
 *
 * Usage:
 *   const { queryPerseus, scoreQuiz, decideCommit, evaluateQuiz } = require("./src");
 *
 *   // 1. Verify answers before showing questions (optional, per type):
 *   const ev = queryPerseus("where is auth enforced?", { indexId });
 *
 *   // 2+3. After the user answers, score and decide in one call:
 *   const { score, decision } = evaluateQuiz(answeredQuestions);
 */

const { queryPerseus } = require("./perseus");
const { scoreQuiz, scoreQuestion } = require("./scoring");
const { decideCommit } = require("./commit-decision");
const { auditDiff } = require("./security-audit");

/**
 * Score a set of answered questions and produce the commit-gate decision.
 * @param {Array} questions  Per-question payloads (see scoring.js).
 * @returns {{score: object, decision: object}}
 */
function evaluateQuiz(questions) {
  const score = scoreQuiz(questions);
  const decision = decideCommit(score);
  return { score, decision };
}

module.exports = {
  queryPerseus,
  scoreQuiz,
  scoreQuestion,
  decideCommit,
  evaluateQuiz,
  auditDiff,
};

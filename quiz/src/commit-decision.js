"use strict";

/**
 * Module 3 — Commit Decision Logic (PRD §Module 3).
 *
 * Turns a score object (from Module 2) into the initial commit-gate state the
 * frontend renders.
 *
 *   total >= PASS_THRESHOLD -> PASS: commit unlocked, no review, no retake.
 *   total <  PASS_THRESHOLD -> FAIL: commit blocked, show review, retake offered.
 *
 * The FAIL state is the *initial* one. Per the PRD, "Commit Anyway" is always
 * available after the user has seen the review summary; the frontend flips
 * commit_allowed to true at that point — this module only provides the start
 * state and signals whether a review should be generated.
 */

const { PASS_THRESHOLD } = require("./config");

/**
 * @typedef {Object} CommitDecision
 * @property {"PASS"|"FAIL"} decision
 * @property {boolean} commit_allowed
 * @property {boolean} show_review
 * @property {boolean} retake_available
 * @property {boolean} generate_review  Signal for the review LLM (FAIL only).
 */

/**
 * @param {{total: number, passed?: boolean}} scoreResult
 * @returns {CommitDecision}
 */
function decideCommit(scoreResult) {
  const total = scoreResult && typeof scoreResult.total === "number" ? scoreResult.total : 0;
  const passed =
    typeof (scoreResult && scoreResult.passed) === "boolean"
      ? scoreResult.passed
      : total >= PASS_THRESHOLD;

  if (passed) {
    return {
      decision: "PASS",
      commit_allowed: true,
      show_review: false,
      retake_available: false,
      generate_review: false,
    };
  }

  return {
    decision: "FAIL",
    commit_allowed: false,
    show_review: true,
    retake_available: true,
    generate_review: true,
  };
}

module.exports = { decideCommit };

"use strict";

/**
 * Single source of truth for thresholds and scoring weights.
 * Change values here only — never inline in a module (mirrors the team's
 * config-driven convention so reviewers never have to guess a magic number).
 */

module.exports = {
  // Perseus
  PERSEUS_BIN: process.env.PERSEUS_BIN || "perseus",
  PERSEUS_TIMEOUT_MS: 15000,
  PERSEUS_TOP_K: 10,

  // Scoring (PRD §Module 2)
  POINTS: {
    MCQ_CORRECT: 1.0,
    MCQ_INCORRECT: 0.0,
    MATCHING_ALL: 1.0,
    MATCHING_SOME: 0.5,
    MATCHING_NONE: 0.0,
  },

  // Commit decision (PRD §Module 2/3) — pass if total >= this, out of 5.
  PASS_THRESHOLD: 3.0,
  MAX_SCORE: 5.0,
};

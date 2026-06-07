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

  // Anthropic API
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  ANTHROPIC_MAX_TOKENS: 500,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",

  // Scoring (PRD §Module 2)
  POINTS: {
    MCQ_CORRECT: 1.0,
    MCQ_INCORRECT: 0.0,
    FRQ_CORRECT: 1.0,
    FRQ_PARTIAL: 0.5,
    FRQ_INCORRECT: 0.0,
    MATCHING_ALL: 1.0,
    MATCHING_SOME: 0.5,
    MATCHING_NONE: 0.0,
  },

  // Commit decision (PRD §Module 2/3) — pass if total >= this, out of 5.
  PASS_THRESHOLD: 3.0,
  MAX_SCORE: 5.0,
};

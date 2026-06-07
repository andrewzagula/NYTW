"use strict";

/**
 * Module 1 — Perseus Answer Retrieval (PRD §Module 1).
 *
 * Takes a natural-language question, shells out to `perseus query --json`, and
 * returns cited code evidence used to verify the correct answer for MCQ and
 * Matching questions before they are shown to the user.
 *
 * Failure is never fatal: if perseus is missing, not logged in, times out, or
 * returns malformed output, we return { success: false } and the caller falls
 * back to the answer key shipped in the question payload.
 *
 * NOTE: we invoke perseus via execFileSync with an argument array (not a
 * shell-interpolated string) so question text containing quotes, $(...) or
 * backticks cannot inject shell commands.
 */

const { execFileSync } = require("node:child_process");
const { PERSEUS_BIN, PERSEUS_TIMEOUT_MS, PERSEUS_TOP_K } = require("./config");

/**
 * @typedef {Object} PerseusHit
 * @property {string} path
 * @property {number} [line_start]
 * @property {number} [line_end]
 * @property {string} [snippet]
 * @property {number} [score]
 * @property {string} [enclosing_symbol]
 */

/**
 * @typedef {Object} PerseusResult
 * @property {boolean} success
 * @property {string|null} evidence  Human-readable `path:lines — note` lines.
 * @property {string} [answer]       Perseus's synthesized prose answer.
 * @property {PerseusHit[]} [hits]   Raw ranked hits.
 * @property {string} [error]        Reason when success === false.
 */

/**
 * Format one hit as `path:line_start-line_end — first snippet line`.
 * @param {PerseusHit} hit
 * @returns {string}
 */
function formatHit(hit) {
  const lines =
    hit.line_start != null && hit.line_end != null && hit.line_end !== hit.line_start
      ? `${hit.line_start}-${hit.line_end}`
      : hit.line_start != null
        ? String(hit.line_start)
        : "";
  const loc = lines ? `${hit.path}:${lines}` : hit.path;
  const firstLine = (hit.snippet || hit.enclosing_symbol || "")
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  return firstLine ? `${loc} — ${firstLine}` : loc;
}

/**
 * Build the evidence string the PRD contract expects from parsed perseus JSON.
 * @param {{hits?: PerseusHit[]}} parsed
 * @returns {string}
 */
function buildEvidence(parsed) {
  const hits = Array.isArray(parsed.hits) ? parsed.hits : [];
  return hits.map(formatHit).join("\n");
}

/**
 * Query Perseus for evidence supporting a question's answer.
 *
 * @param {string} query              The natural-language question to ask.
 * @param {Object} [options]
 * @param {string} [options.indexId]  Explicit index id; omit to use cwd repo.
 * @param {number} [options.timeout]  ms before giving up (default 15s).
 * @param {number} [options.topK]     Max hits to request.
 * @returns {PerseusResult}
 */
function queryPerseus(query, options = {}) {
  if (typeof query !== "string" || query.trim() === "") {
    return { success: false, evidence: null, error: "empty query" };
  }

  const { indexId, timeout = PERSEUS_TIMEOUT_MS, topK = PERSEUS_TOP_K } = options;

  // perseus query [INDEX_ID] QUESTION --json -k N
  const args = ["query"];
  if (indexId) args.push(indexId);
  args.push(query, "--json", "-k", String(topK));

  let stdout;
  try {
    stdout = execFileSync(PERSEUS_BIN, args, {
      encoding: "utf8",
      timeout,
      // Capture stdout even if perseus writes diagnostics to stderr.
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (e) {
    // ENOENT (not installed), non-zero exit (not logged in / bad index),
    // or ETIMEDOUT all land here. Degrade gracefully.
    const reason =
      e && e.code === "ENOENT"
        ? "perseus not installed"
        : e && e.signal === "SIGTERM"
          ? "perseus timed out"
          : e && e.message
            ? e.message.split("\n")[0]
            : "perseus query failed";
    return { success: false, evidence: null, error: reason };
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { success: false, evidence: null, error: "unparseable perseus output" };
  }

  const evidence = buildEvidence(parsed);
  return {
    success: true,
    evidence,
    answer: typeof parsed.answer === "string" ? parsed.answer : "",
    hits: Array.isArray(parsed.hits) ? parsed.hits : [],
  };
}

module.exports = { queryPerseus, buildEvidence, formatHit };

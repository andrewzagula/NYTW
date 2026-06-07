"use strict";

/**
 * Module 4 — Security Audit (pre-commit gate, independent of quiz score).
 *
 * Flow: get staged diff -> inject into prompt -> POST to LLM endpoint -> parse JSON.
 *
 * The LLM call is provider-agnostic: set SECURITY_AUDIT_URL to whatever
 * backend wraps the LLM (Walkthru API, OpenAI, Gemini, etc.). The endpoint
 * must accept { prompt: string } and return { content: string } where content
 * is the JSON the audit prompt produces.
 *
 * safe_to_commit is independent of quiz score — a critical security issue
 * blocks the commit even after a perfect 5/5.
 */

const { execFileSync } = require("node:child_process");

const AUDIT_PROMPT = `You are a security auditor reviewing a git diff. Analyze the following diff and check for:

Hardcoded secrets — API keys, tokens, passwords, private keys, or credentials embedded directly in code or config files
Exposed environment variables — .env files being committed, or process.env values being logged or returned in responses
Insecure patterns — SQL injection vectors, unsanitized user input, eval() on user data, disabled SSL verification, hardcoded IPs or internal URLs
Sensitive data in logs — PII, tokens, or passwords being printed to stdout or logs
Dangerous dependencies — newly added packages with known vulnerabilities or suspicious provenance

Return JSON only, no preamble:
{
  "issues": [
    {
      "severity": "critical | high | medium | low",
      "type": "secret | env | insecure-pattern | data-leak | dependency",
      "file": "path/to/file.js",
      "line": 42,
      "description": "What the issue is and why it's a problem",
      "fix": "Exact steps to resolve it"
    }
  ],
  "safe_to_commit": true | false
}
If no issues are found, return "issues": [] and "safe_to_commit": true.
Diff:
{INSERT_DIFF_HERE}`;

/**
 * Get the staged diff (what's about to be committed).
 * Falls back to HEAD diff when nothing is staged (useful in pre-push context).
 * @returns {string}
 */
function getStagedDiff() {
  try {
    const staged = execFileSync("git", ["diff", "--cached"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (staged.trim()) return staged;

    // Nothing staged — diff against HEAD (pre-push usage).
    return execFileSync("git", ["diff", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/**
 * Build the audit prompt by injecting the diff.
 * @param {string} diff
 * @returns {string}
 */
function buildPrompt(diff) {
  return AUDIT_PROMPT.replace("{INSERT_DIFF_HERE}", diff || "(empty diff — no staged changes)");
}

/**
 * Parse the LLM's text response into the structured audit result.
 * Handles responses wrapped in markdown code fences.
 * @param {string} text
 * @returns {{ issues: object[], safe_to_commit: boolean }}
 */
function parseAuditResponse(text) {
  const stripped = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  const parsed = JSON.parse(stripped);
  if (!Array.isArray(parsed.issues)) throw new Error("missing issues array");
  if (typeof parsed.safe_to_commit !== "boolean") throw new Error("missing safe_to_commit");
  return parsed;
}

/**
 * Call the configured LLM endpoint with the audit prompt.
 * Expects SECURITY_AUDIT_URL env (POST { prompt } -> { content }).
 * @param {string} prompt
 * @param {object} [options]
 * @param {string} [options.url]    Override SECURITY_AUDIT_URL.
 * @param {string} [options.token] Bearer token (SECURITY_AUDIT_TOKEN env).
 * @param {number} [options.timeout] ms (default 30s).
 * @returns {Promise<string>}  Raw LLM text response.
 */
async function callLlmEndpoint(prompt, options = {}) {
  const url = options.url || process.env.SECURITY_AUDIT_URL;
  if (!url) throw new Error("SECURITY_AUDIT_URL not set");

  const token = options.token || process.env.SECURITY_AUDIT_TOKEN;
  const timeout = options.timeout || 30000;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Accept { content } or { text } or { response } or plain string.
    const text = json.content ?? json.text ?? json.response ?? (typeof json === "string" ? json : null);
    if (text == null) throw new Error("no content field in response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run the full security audit against the staged diff.
 *
 * @param {object} [options]
 * @param {string} [options.diff]       Diff string (default: auto from git).
 * @param {Function} [options.callLlm] Replaces the HTTP call (for testing).
 * @param {string} [options.url]
 * @param {string} [options.token]
 * @param {number} [options.timeout]
 * @returns {Promise<{ issues: object[], safe_to_commit: boolean, error?: string }>}
 */
async function auditDiff(options = {}) {
  const diff = options.diff !== undefined ? options.diff : getStagedDiff();
  const prompt = buildPrompt(diff);

  let text;
  try {
    const caller = options.callLlm || callLlmEndpoint;
    text = await caller(prompt, options);
  } catch (e) {
    // Endpoint unavailable — fail open (don't block commit for infra reasons).
    return {
      issues: [],
      safe_to_commit: true,
      error: `security audit unavailable: ${e.message}`,
    };
  }

  try {
    return parseAuditResponse(text);
  } catch (e) {
    return {
      issues: [],
      safe_to_commit: true,
      error: `could not parse audit response: ${e.message}`,
    };
  }
}

module.exports = { auditDiff, getStagedDiff, buildPrompt, parseAuditResponse };

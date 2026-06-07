"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPrompt, parseAuditResponse, auditDiff } = require("../src/security-audit");

test("buildPrompt injects diff into the template", () => {
  const p = buildPrompt("diff --git a/foo.js");
  assert.match(p, /diff --git a\/foo\.js/);
  assert.doesNotMatch(p, /\{INSERT_DIFF_HERE\}/);
});

test("buildPrompt handles empty diff gracefully", () => {
  const p = buildPrompt("");
  assert.match(p, /empty diff/);
});

test("parseAuditResponse parses clean JSON", () => {
  const raw = JSON.stringify({ issues: [], safe_to_commit: true });
  const r = parseAuditResponse(raw);
  assert.deepEqual(r.issues, []);
  assert.equal(r.safe_to_commit, true);
});

test("parseAuditResponse strips markdown code fences", () => {
  const raw = "```json\n" + JSON.stringify({ issues: [], safe_to_commit: true }) + "\n```";
  const r = parseAuditResponse(raw);
  assert.equal(r.safe_to_commit, true);
});

test("parseAuditResponse parses issues with severity", () => {
  const payload = {
    issues: [{ severity: "critical", type: "secret", file: "config.js", line: 5, description: "API key", fix: "use env var" }],
    safe_to_commit: false,
  };
  const r = parseAuditResponse(JSON.stringify(payload));
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].severity, "critical");
  assert.equal(r.safe_to_commit, false);
});

test("parseAuditResponse throws on missing issues array", () => {
  assert.throws(() => parseAuditResponse(JSON.stringify({ safe_to_commit: true })));
});

test("parseAuditResponse throws on missing safe_to_commit", () => {
  assert.throws(() => parseAuditResponse(JSON.stringify({ issues: [] })));
});

test("auditDiff fails open (safe_to_commit true) when endpoint unavailable", async () => {
  const r = await auditDiff({
    diff: "diff --git a/x.js",
    callLlm: async () => { throw new Error("connection refused"); },
  });
  assert.equal(r.safe_to_commit, true);
  assert.match(r.error, /security audit unavailable/);
});

test("auditDiff fails open when LLM returns unparseable text", async () => {
  const r = await auditDiff({
    diff: "diff --git a/x.js",
    callLlm: async () => "not json at all",
  });
  assert.equal(r.safe_to_commit, true);
  assert.match(r.error, /could not parse/);
});

test("auditDiff returns parsed result on success", async () => {
  const payload = { issues: [], safe_to_commit: true };
  const r = await auditDiff({
    diff: "diff --git a/x.js",
    callLlm: async () => JSON.stringify(payload),
  });
  assert.equal(r.safe_to_commit, true);
  assert.deepEqual(r.issues, []);
  assert.equal(r.error, undefined);
});

test("auditDiff with blocked issues returns safe_to_commit false", async () => {
  const payload = {
    issues: [{ severity: "critical", type: "secret", file: "a.js", line: 1, description: "key", fix: "remove" }],
    safe_to_commit: false,
  };
  const r = await auditDiff({
    diff: "diff --git a/a.js",
    callLlm: async () => JSON.stringify(payload),
  });
  assert.equal(r.safe_to_commit, false);
  assert.equal(r.issues[0].severity, "critical");
});

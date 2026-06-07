"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEvidence, formatHit, queryPerseus } = require("../src/perseus");

// Real-shaped fixture captured from `perseus query --json`.
const FIXTURE = {
  run_id: "qry-test",
  answer: "src/analysis.py performs the pitch analysis.",
  hits: [
    {
      path: "src/analysis.py",
      score: 3.5,
      line_start: 125,
      line_end: 162,
      snippet: "def _reference_semitone_contour(\n    reference, n_frames, frame_times):",
      enclosing_symbol: "_reference_semitone_contour",
    },
    {
      path: "frontend/src/App.jsx",
      score: 1.4,
      line_start: 1,
      line_end: 1,
      snippet: "import React from 'react'",
    },
  ],
};

test("formatHit renders path:line-range — first snippet line", () => {
  assert.equal(
    formatHit(FIXTURE.hits[0]),
    "src/analysis.py:125-162 — def _reference_semitone_contour(",
  );
});

test("formatHit collapses single-line range", () => {
  assert.equal(formatHit(FIXTURE.hits[1]), "frontend/src/App.jsx:1 — import React from 'react'");
});

test("buildEvidence joins hits one per line", () => {
  const evidence = buildEvidence(FIXTURE);
  assert.equal(evidence.split("\n").length, 2);
  assert.match(evidence, /src\/analysis\.py:125-162/);
});

test("buildEvidence tolerates no hits", () => {
  assert.equal(buildEvidence({}), "");
});

test("queryPerseus rejects empty query without shelling out", () => {
  const r = queryPerseus("   ");
  assert.equal(r.success, false);
  assert.equal(r.error, "empty query");
});

test("queryPerseus degrades gracefully when binary is missing", () => {
  const r = queryPerseus("anything", { indexId: "x" });
  // With a bogus PERSEUS_BIN we must get success:false, never throw.
  const bogus = require("../src/perseus");
  process.env.PERSEUS_BIN = "definitely-not-a-real-binary-xyz";
  delete require.cache[require.resolve("../src/config")];
  delete require.cache[require.resolve("../src/perseus")];
  const fresh = require("../src/perseus");
  const out = fresh.queryPerseus("anything");
  assert.equal(out.success, false);
  assert.equal(out.evidence, null);
  assert.ok(typeof out.error === "string");
  delete process.env.PERSEUS_BIN;
  delete require.cache[require.resolve("../src/config")];
  delete require.cache[require.resolve("../src/perseus")];
  // touch unused refs to keep linters quiet
  void r;
  void bogus;
});

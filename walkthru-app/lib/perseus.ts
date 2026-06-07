import "server-only";

/**
 * Minimal client for the perseus.computer retrieval API.
 *
 * Auth is, for now, a hardcoded next-auth session-token cookie (set via
 * PERSEUS_SESSION_TOKEN, with a baked-in fallback) rather than a real login
 * flow — perseus has no machine-token issuance we're wired into yet, so we
 * borrow a console session. The token is a JWT that expires (~monthly); when
 * queries start 401ing, refresh PERSEUS_SESSION_TOKEN from the browser.
 *
 * Flow: POST /api/query starts a run and returns a run_id; GET /api/query/{id}
 * returns the run, completing with `result.hits`. We poll the run instead of
 * consuming the SSE stream — the stream only carries MCTS telemetry, while the
 * GET payload carries the actual hits. Never throws: any failure yields [] so
 * chat degrades to an ungrounded answer rather than erroring.
 */

const PERSEUS_BASE = process.env.PERSEUS_BASE_URL ?? "https://perseus.computer";

// Hardcoded console session cookie. Override via PERSEUS_SESSION_TOKEN in .env.
const SESSION_TOKEN =
  process.env.PERSEUS_SESSION_TOKEN ??
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InBlcnNldXMtbWFpbi0xIn0.eyJzdWIiOiI2Y2YwNDNiOS1kYzVmLTJhZTktMzFiNC0zMDVmZjI0NWVlNzgiLCJlbWFpbCI6ImRldmluNzg5ODhAZ21haWwuY29tIiwibmFtZSI6ImRldmluIiwidGVuYW50X2lkIjoiYzUyNWVmMWQtNjc3Zi1jMDY4LWQ0MzktNjUyYWY3MGM3OTFiIiwiZ2l0aHViX2lkIjoiODA4NTc5NzgiLCJnaXRodWJfbG9naW4iOiJkbGl1OTkiLCJyb2xlIjoibWVtYmVyIiwiaXNzIjoiaHR0cHM6Ly9wZXJzZXVzLmNvbXB1dGVyIiwiYXVkIjoicGVyc2V1cy1hcGkiLCJpYXQiOjE3ODA4NjIyODEsImV4cCI6MTc4MzQ1NDI4MX0.WnYEsVhdMFXlXtWWD6e7aAr04tcNTz6CF4UuqA7kmlFBfS2_hNE3eH5M9l4gDBND9_Z7jgaQulWKhk8JoIxR7cu-ll0AcNYEE-bqUsJTGflJEiqmSoE9XDLZFBimtt9jDQBdnHzqbEzQlHOqVE7GitLctD-Tw0zocDcj6W6iWGAL8yT_zAUH39WQwioHabAEOOg89imK7LDm8VL-HMv810s--i0xF1ey1kFYm-1w7tSjVd5KyWY5dY1fNJI0-Fj0CMdNqZ9YsDM8-ZbcfoyhxyxOAneag7Y6X_6ub1D23qRS6OsDs_EpbbCv6qDMuAd8vqwJUl6tk-ISqSdjx43Q6w";

export type PerseusHit = {
  path: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  score: number;
};

type RawHit = {
  path: string;
  score: number;
  line_start: number;
  line_end: number;
  snippet: string;
};

type RunPayload = {
  status: string;
  result?: { hits?: RawHit[] } | null;
};

function cookieHeader(): string {
  return `__Secure-next-auth.session-token=${SESSION_TOKEN}`;
}

export function mapHits(raw: RawHit[]): PerseusHit[] {
  return raw.map((h) => ({
    path: h.path,
    lineStart: h.line_start,
    lineEnd: h.line_end,
    snippet: h.snippet,
    score: h.score,
  }));
}

const POLL_INTERVAL_MS = 400;
const MAX_WAIT_MS = 20_000;

/**
 * Query a perseus index for code relevant to `question`. Returns ranked hits,
 * or [] on any failure (missing index id, auth expiry, timeout, network).
 */
export async function queryIndex(
  question: string,
  topK = 6,
): Promise<PerseusHit[]> {
  const indexId = process.env.PERSEUS_INDEX_ID;
  if (!indexId || !question.trim()) return [];

  try {
    const startRes = await fetch(`${PERSEUS_BASE}/api/query`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(),
      },
      body: JSON.stringify({ index_id: indexId, query: question, top_k: topK }),
    });
    if (!startRes.ok) return [];
    const { run_id: runId } = (await startRes.json()) as { run_id?: string };
    if (!runId) return [];

    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
      const runRes = await fetch(`${PERSEUS_BASE}/api/query/${runId}`, {
        headers: { accept: "application/json", cookie: cookieHeader() },
      });
      if (runRes.ok) {
        const run = (await runRes.json()) as RunPayload;
        if (run.status === "completed") {
          return mapHits(run.result?.hits ?? []);
        }
        if (run.status === "failed" || run.status === "error") {
          return [];
        }
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return [];
  } catch {
    return [];
  }
}

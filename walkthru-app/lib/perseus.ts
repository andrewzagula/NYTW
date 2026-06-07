import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PerseusHit } from "@/lib/chat/context";

const run = promisify(execFile);

type RawHit = {
  path: string;
  line_start: number;
  line_end: number;
  snippet: string;
};

export function parsePerseusJson(stdout: string): PerseusHit[] {
  try {
    const data = JSON.parse(stdout) as { hits?: RawHit[] };
    if (!Array.isArray(data.hits)) return [];
    return data.hits.map((h) => ({
      path: h.path,
      lineStart: h.line_start,
      lineEnd: h.line_end,
      snippet: h.snippet,
    }));
  } catch {
    return [];
  }
}

/**
 * Query a Perseus index for code relevant to `question`. Real mode only.
 * Never throws — returns [] on any failure so chat degrades gracefully
 * (a Perseus miss/error must not hard-fail the chat).
 *
 * Production can call the Perseus HTTP API directly (PERSEUS_API_URL /
 * PERSEUS_TOKEN); this CLI wrapper is the dev/default path.
 */
export async function queryIndex(
  indexId: string,
  question: string,
  topK = 5,
): Promise<PerseusHit[]> {
  if (!question.trim()) return [];
  try {
    const { stdout } = await run(
      "perseus",
      ["query", indexId, question, "--json", "--no-summary", "-k", String(topK)],
      { timeout: 15_000, maxBuffer: 8 * 1024 * 1024, env: process.env },
    );
    return parsePerseusJson(stdout);
  } catch {
    return [];
  }
}

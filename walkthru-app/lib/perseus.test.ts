import { describe, it, expect } from "vitest";
import { parsePerseusJson } from "@/lib/perseus";

describe("parsePerseusJson", () => {
  it("maps hits from perseus --json output", () => {
    const stdout = JSON.stringify({
      hits: [
        { path: "src/cache.ts", line_start: 10, line_end: 22, score: 0.9, snippet: "class LruCache {}" },
      ],
    });
    const hits = parsePerseusJson(stdout);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toEqual({
      path: "src/cache.ts",
      lineStart: 10,
      lineEnd: 22,
      snippet: "class LruCache {}",
    });
  });

  it("returns [] for empty hits", () => {
    expect(parsePerseusJson(JSON.stringify({ hits: [] }))).toEqual([]);
  });

  it("returns [] for malformed output rather than throwing", () => {
    expect(parsePerseusJson("not json")).toEqual([]);
    expect(parsePerseusJson("{}")).toEqual([]);
  });
});

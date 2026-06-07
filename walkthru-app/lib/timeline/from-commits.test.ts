import { describe, it, expect } from "vitest";
import { toTimelineNodes } from "@/lib/timeline/from-commits";
import type { Commit } from "@/lib/github";

function c(sha: string, parents: string[] = [], extra: Partial<Commit> = {}): Commit {
  return {
    sha,
    message: extra.message ?? `commit ${sha}`,
    author: extra.author ?? "Test User",
    date: extra.date ?? "2026-01-01T00:00:00Z",
    parents,
  };
}

describe("toTimelineNodes", () => {
  it("returns empty for an empty input", () => {
    expect(toTimelineNodes([])).toEqual([]);
  });

  it("places a linear history entirely on lane 0", () => {
    const commits = [c("c3", ["c2"]), c("c2", ["c1"]), c("c1", [])];
    const nodes = toTimelineNodes(commits);
    expect(nodes.map((n) => n.lane)).toEqual([0, 0, 0]);
    expect(nodes.every((n) => n.type === "commit")).toBe(true);
  });

  it("treats a commit with ≥ 2 parents as a merge", () => {
    const commits = [
      c("merge", ["main2", "feat2"]),
      c("feat2", ["feat1"]),
      c("feat1", ["main1"]),
      c("main2", ["main1"]),
      c("main1", []),
    ];
    const nodes = toTimelineNodes(commits);
    const merge = nodes.find((n) => n.sha === "merge")!;
    expect(merge.type).toBe("merge");
    expect(merge.lane).toBe(0); // merge is on the first-parent chain
  });

  it("puts off-first-parent commits on lane 1", () => {
    // Topology:
    //   merge (parents: m1, f2)   <- newest
    //   f2     (parents: f1)
    //   f1     (parents: m1)
    //   m1     (parents: -)
    const commits = [
      c("merge", ["m1", "f2"]),
      c("f2", ["f1"]),
      c("f1", ["m1"]),
      c("m1", []),
    ];
    const nodes = toTimelineNodes(commits);
    const lanes = Object.fromEntries(nodes.map((n) => [n.sha, n.lane]));
    expect(lanes["merge"]).toBe(0);
    expect(lanes["m1"]).toBe(0);
    expect(lanes["f1"]).toBe(1);
    expect(lanes["f2"]).toBe(1);
  });

  it("derives initials from the author name", () => {
    const nodes = toTimelineNodes([
      c("x", [], { author: "Andrew Zagula" }),
    ]);
    expect(nodes[0].author.initials).toBe("AZ");
    expect(nodes[0].author.name).toBe("Andrew Zagula");
  });

  it("scores every commit as null", () => {
    const nodes = toTimelineNodes([c("x", [])]);
    expect(nodes[0].score).toBeNull();
  });

  it("does not loop on cycles in the parent map", () => {
    const commits = [c("a", ["b"]), c("b", ["a"])];
    expect(() => toTimelineNodes(commits)).not.toThrow();
  });
});

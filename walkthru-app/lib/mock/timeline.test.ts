import { describe, it, expect } from "vitest";
import { getCommit, getTimeline } from "@/lib/mock/timeline";

describe("getCommit", () => {
  it("returns the node matching a sha", () => {
    const node = getCommit("checkout-service", "a91c4e8");
    expect(node?.sha).toBe("a91c4e8");
    expect(node?.message).toContain("LRU");
  });

  it("returns undefined for an unknown sha", () => {
    expect(getCommit("checkout-service", "nope123")).toBeUndefined();
  });

  it("only returns shas that exist in the timeline", () => {
    const all = getTimeline("checkout-service").map((n) => n.sha);
    const node = getCommit("checkout-service", all[0]);
    expect(node).toBeDefined();
  });
});

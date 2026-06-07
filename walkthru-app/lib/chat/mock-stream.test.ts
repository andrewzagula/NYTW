import { describe, it, expect } from "vitest";
import { buildMockChunks } from "@/lib/chat/mock-stream";

describe("buildMockChunks", () => {
  const chunks = buildMockChunks("hello world");

  it("opens with a start frame and a text-start frame", () => {
    expect(chunks[0]).toContain('"type":"start"');
    expect(chunks[1]).toContain('"type":"text-start"');
  });

  it("ends with text-end, finish, then [DONE]", () => {
    expect(chunks.at(-3)).toContain('"type":"text-end"');
    expect(chunks.at(-2)).toContain('"type":"finish"');
    expect(chunks.at(-1)).toContain("[DONE]");
  });

  it("streams the full answer across text-delta frames", () => {
    const reconstructed = chunks
      .filter((c) => c.includes('"text-delta"'))
      .map((c) => JSON.parse(c.replace(/^data: /, "").trim()).delta)
      .join("");
    expect(reconstructed).toBe("hello world");
  });

  it("escapes JSON-unsafe text", () => {
    const c = buildMockChunks('a "quote" and \n newline');
    const reconstructed = c
      .filter((x) => x.includes('"text-delta"'))
      .map((x) => JSON.parse(x.replace(/^data: /, "").trim()).delta)
      .join("");
    expect(reconstructed).toBe('a "quote" and \n newline');
  });
});

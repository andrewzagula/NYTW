import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { messagesToRows, rowsToMessages } from "@/lib/chat/persistence";

const msgs: UIMessage[] = [
  { id: "a", role: "user", parts: [{ type: "text", text: "why?" }] },
  {
    id: "b",
    role: "assistant",
    parts: [{ type: "text", text: "because" }],
  },
];

describe("messagesToRows", () => {
  it("assigns a 0-based seq in message order", () => {
    const rows = messagesToRows(msgs);
    expect(rows.map((r) => r.seq)).toEqual([0, 1]);
  });

  it("keeps id, role, and parts for each message", () => {
    const [first] = messagesToRows(msgs);
    expect(first).toMatchObject({
      id: "a",
      role: "user",
      parts: [{ type: "text", text: "why?" }],
    });
  });
});

describe("rowsToMessages", () => {
  it("round-trips messages back to UIMessage shape", () => {
    const rows = messagesToRows(msgs);
    expect(rowsToMessages(rows)).toEqual(msgs);
  });

  it("defaults parts to an empty array when the stored value is not an array", () => {
    const messages = rowsToMessages([
      { id: "x", role: "user", parts: null },
    ]);
    expect(messages[0].parts).toEqual([]);
  });
});

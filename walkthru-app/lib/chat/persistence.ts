import type { UIMessage } from "ai";

/**
 * A persisted chat message — the storable slice of a UIMessage plus its order
 * within a thread. `parts` is stored verbatim (JSONB) so messages round-trip
 * back into `useChat` without lossy conversion.
 */
export type StoredChatMessage = {
  id: string;
  role: string;
  parts: unknown;
  seq: number;
};

/** Flatten a conversation into ordered, storable rows. */
export function messagesToRows(messages: UIMessage[]): StoredChatMessage[] {
  return messages.map((m, seq) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
    seq,
  }));
}

/** Reconstruct UIMessages from stored rows (already ordered by seq). */
export function rowsToMessages(
  rows: Array<{ id: string; role: string; parts: unknown }>,
): UIMessage[] {
  return rows.map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: (Array.isArray(r.parts) ? r.parts : []) as UIMessage["parts"],
  }));
}

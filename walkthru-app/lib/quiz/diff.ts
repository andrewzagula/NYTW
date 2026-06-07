import { fetchCommitDiff, type CommitDetail } from "@/lib/github";
import type { McqGenInput } from "./mcq";

const MAX_DIFF_CHARS = 16_000;

export function truncateDiff(detail: {
  files: Array<{ filename: string; patch: string | null }>;
}): string {
  const parts: string[] = [];
  let used = 0;
  for (const f of detail.files) {
    if (!f.patch) continue;
    const block = `--- ${f.filename} ---\n${f.patch}`;
    if (used + block.length > MAX_DIFF_CHARS) {
      parts.push(
        `(diff truncated; ${detail.files.length - parts.length} more files omitted)`,
      );
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n");
}

/**
 * Pull the commit diff and build the input the question generator needs.
 * Throws if the diff cannot be fetched or is empty — we never generate
 * questions without a real diff.
 */
export async function loadGenInput(
  owner: string,
  name: string,
  sha: string,
  token: string,
): Promise<McqGenInput> {
  const detail: CommitDetail | { error: string; status: number } =
    await fetchCommitDiff(owner, name, sha, token);
  if ("error" in detail) {
    throw new Error(
      `Could not fetch diff for ${owner}/${name}@${sha.slice(0, 7)}: ${detail.error} (${detail.status})`,
    );
  }
  const diff = truncateDiff(detail);
  if (!diff.trim()) {
    throw new Error(
      `No diff content available for ${owner}/${name}@${sha.slice(0, 7)} — commit may be empty or all files binary.`,
    );
  }
  return {
    repo: `${owner}/${name}`,
    commitSha: detail.sha,
    commitMessage: detail.message,
    diff,
  };
}

/**
 * Convert real GitHub commits (flat list, newest first) into the TimelineNode
 * shape consumed by `components/timeline/timeline-graph.tsx`.
 *
 * Lane assignment:
 * - Walk first parents from the newest commit. Those go on lane 0 (main).
 * - Any commit reached only via a non-first parent goes on lane 1 (feature).
 * - Commits the walk never reaches (orphans / branched-out, dead history)
 *   stay on lane 0 — the SVG handles single-rail rendering when lane 1 is
 *   empty.
 *
 * Type: a commit with ≥ 2 parents becomes `type: "merge"`.
 */

import type { Commit } from "@/lib/github";
import type { TimelineNode, TimelineAuthor } from "@/lib/timeline/types";

export type LaneBranchNames = {
  main: string;
  feature: string;
};

function authorFrom(name: string): TimelineAuthor {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const ini = parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
  return { name: name || "Unknown", initials: ini };
}

export function toTimelineNodes(
  commits: Commit[],
  branches: LaneBranchNames = { main: "main", feature: "feature" }
): TimelineNode[] {
  if (commits.length === 0) return [];

  const bySha = new Map<string, Commit>();
  for (const c of commits) bySha.set(c.sha, c);

  // First-parent chain from the newest. Set semantics — a sha is "on main" iff
  // we reached it by following first parents.
  const onMain = new Set<string>();
  let cursor: string | undefined = commits[0].sha;
  while (cursor && bySha.has(cursor) && !onMain.has(cursor)) {
    onMain.add(cursor);
    const next: Commit | undefined = bySha.get(cursor);
    cursor = next?.parents[0];
  }

  return commits.map<TimelineNode>((c) => {
    const lane: 0 | 1 = onMain.has(c.sha) ? 0 : 1;
    return {
      sha: c.sha,
      message: c.message,
      author: authorFrom(c.author),
      date: c.date,
      branch: lane === 0 ? branches.main : branches.feature,
      lane,
      parents: c.parents,
      score: null,
      type: c.parents.length >= 2 ? "merge" : "commit",
    };
  });
}

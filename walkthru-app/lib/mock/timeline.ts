/**
 * Mocked git timeline for a repo. A `main` lane with one feature branch that
 * diverges and merges back — enough to exercise the two-lane graph renderer.
 * Replaced by real GitHub history later.
 */

export type TimelineAuthor = { name: string; initials: string };

export type TimelineNode = {
  sha: string;
  message: string;
  author: TimelineAuthor;
  /** ISO timestamp. */
  date: string;
  branch: string;
  /** 0 = main lane, 1 = feature lane. */
  lane: 0 | 1;
  parents: string[];
  /** Comprehension score, or null when committed without the CLI gate. */
  score: number | null;
  type: "commit" | "merge";
};

const HOUR = 60 * 60 * 1000;
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR).toISOString();

const AZ: TimelineAuthor = { name: "Andrew Zagula", initials: "AZ" };
const PM: TimelineAuthor = { name: "Priya Menon", initials: "PM" };
const DK: TimelineAuthor = { name: "Diego Carter", initials: "DC" };

const FEATURE = "feat/lru-cache";

// Newest first (top of the timeline).
const canonical: TimelineNode[] = [
  {
    sha: "c8a1f3d",
    message: "Merge pull request #142: LRU cache for session store",
    author: AZ,
    date: hoursAgo(5),
    branch: "main",
    lane: 0,
    parents: ["e5b9c20", "f2d7a11"],
    score: null,
    type: "merge",
  },
  {
    sha: "f2d7a11",
    message: "Guard against cold-start cache miss",
    author: PM,
    date: hoursAgo(9),
    branch: FEATURE,
    lane: 1,
    parents: ["a91c4e8"],
    score: 88,
    type: "commit",
  },
  {
    sha: "a91c4e8",
    message: "Replace TTL cache with LRU eviction",
    author: PM,
    date: hoursAgo(26),
    branch: FEATURE,
    lane: 1,
    parents: ["e5b9c20"],
    score: 74,
    type: "commit",
  },
  {
    sha: "e5b9c20",
    message: "Normalize cache keys before lookup",
    author: AZ,
    date: hoursAgo(30),
    branch: "main",
    lane: 0,
    parents: ["b3370af"],
    score: 91,
    type: "commit",
  },
  {
    sha: "b3370af",
    message: "Add jitter to retry backoff",
    author: DK,
    date: hoursAgo(52),
    branch: "main",
    lane: 0,
    parents: ["7c1d489"],
    score: 62,
    type: "commit",
  },
  {
    sha: "7c1d489",
    message: "Extract shared HTTP client",
    author: AZ,
    date: hoursAgo(74),
    branch: "main",
    lane: 0,
    parents: ["2af0b6e"],
    score: 79,
    type: "commit",
  },
  {
    sha: "2af0b6e",
    message: "Add structured request logging",
    author: DK,
    date: hoursAgo(96),
    branch: "main",
    lane: 0,
    parents: ["10ee931"],
    score: 45,
    type: "commit",
  },
  {
    sha: "10ee931",
    message: "Initialize checkout service",
    author: AZ,
    date: hoursAgo(140),
    branch: "main",
    lane: 0,
    parents: [],
    score: null,
    type: "commit",
  },
];

export function getTimeline(_repoId: string): TimelineNode[] {
  return canonical;
}

export function getBranches(_repoId: string): string[] {
  return ["main", FEATURE];
}

export function getCommit(_repoId: string, sha: string): TimelineNode | undefined {
  return canonical.find((n) => n.sha === sha);
}

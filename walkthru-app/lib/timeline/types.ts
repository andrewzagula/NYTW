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

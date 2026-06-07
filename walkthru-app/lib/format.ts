/** Small presentation helpers shared across screens. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "3 days ago", "5h ago", "just now". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  const w = Math.floor(diff / WEEK);
  if (w < 5) return `${w} week${w === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export type ScoreTier = "low" | "mid" | "high";

export function scoreTier(score: number): ScoreTier {
  if (score < 50) return "low";
  if (score < 75) return "mid";
  return "high";
}

/** Tailwind classes per tier, keyed to the custom score-* color tokens. */
export const scoreClasses: Record<
  ScoreTier,
  { text: string; ring: string; dot: string; soft: string }
> = {
  low: {
    text: "text-score-low",
    ring: "ring-score-low/40",
    dot: "bg-score-low",
    soft: "bg-score-low/10",
  },
  mid: {
    text: "text-score-mid",
    ring: "ring-score-mid/40",
    dot: "bg-score-mid",
    soft: "bg-score-mid/10",
  },
  high: {
    text: "text-score-high",
    ring: "ring-score-high/40",
    dot: "bg-score-high",
    soft: "bg-score-high/10",
  },
};

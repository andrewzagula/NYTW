import { TimelineRow, type DayBucket } from "./TimelineRow";

export interface CommitSummaryEntry {
  sha: string;
  date: string;
  author: string;
  additions: number;
  deletions: number;
}

interface Props {
  summary: CommitSummaryEntry[] | null;
  loading: boolean;
  error: string | null;
  onSelectCommit: (sha: string) => void;
}

function bucketByDay(entries: CommitSummaryEntry[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const e of entries) {
    const day = e.date.slice(0, 10);
    let b = map.get(day);
    if (!b) {
      b = { day, additions: 0, deletions: 0, commits: [] };
      map.set(day, b);
    }
    b.additions += e.additions;
    b.deletions += e.deletions;
    b.commits.push({ sha: e.sha, author: e.author, date: e.date });
  }
  for (const b of map.values()) {
    b.commits.sort((a, c) => a.date.localeCompare(c.date));
  }
  return [...map.values()].sort((a, c) => c.day.localeCompare(a.day));
}

export function Timeline({ summary, loading, error, onSelectCommit }: Props) {
  if (error) {
    return (
      <div className="text-xs text-red-400 p-2">
        Failed to load timeline: {error}
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="text-xs text-gray-400 p-2 animate-pulse">
        Loading timeline...
      </div>
    );
  }

  if (summary.length === 0) {
    return <div className="text-xs text-gray-400 p-2">No commits in range.</div>;
  }

  const buckets = bucketByDay(summary);
  const maxSide = Math.max(
    ...buckets.map((b) => Math.max(b.additions, b.deletions)),
    1
  );

  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide px-1 pb-1">
        Timeline · {buckets.length} days
      </div>
      {buckets.map((b) => (
        <TimelineRow
          key={b.day}
          bucket={b}
          maxSide={maxSide}
          onClick={onSelectCommit}
        />
      ))}
    </div>
  );
}

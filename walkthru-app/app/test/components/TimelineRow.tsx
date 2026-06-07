import { AuthorDots } from "./AuthorDots";

export interface DayBucket {
  day: string;
  additions: number;
  deletions: number;
  commits: Array<{ sha: string; author: string; date: string }>;
}

interface Props {
  bucket: DayBucket;
  maxSide: number;
  onClick: (sha: string) => void;
}

function formatDay(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getUTCFullYear() === now.getUTCFullYear()
      ? { month: "short", day: "numeric", timeZone: "UTC" }
      : { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-US", opts).format(d);
}

export function TimelineRow({ bucket, maxSide, onClick }: Props) {
  const addWidth = maxSide > 0 ? (bucket.additions / maxSide) * 55 : 0;
  const delWidth = maxSide > 0 ? (bucket.deletions / maxSide) * 55 : 0;

  const authors = bucket.commits.map((c) => c.author);
  const uniqueAuthors = [...new Set(authors)];
  const tooltip = `${bucket.commits.length} commits · +${bucket.additions} / -${bucket.deletions} · ${uniqueAuthors.join(", ")}`;

  return (
    <button
      onClick={() => onClick(bucket.commits[0].sha)}
      title={tooltip}
      className="w-full flex items-center gap-2 py-1 px-1 hover:bg-gray-900 rounded text-left"
    >
      <span className="text-[10px] text-gray-400 w-12 shrink-0">
        {formatDay(bucket.day)}
      </span>
      <div className="relative flex items-center w-[110px] shrink-0 h-2">
        <div className="absolute inset-0 bg-gray-900 rounded" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-700" />
        <div
          className="absolute top-0 bottom-0 bg-red-500 rounded-l"
          style={{ right: "50%", width: `${delWidth}px` }}
        />
        <div
          className="absolute top-0 bottom-0 bg-green-500 rounded-r"
          style={{ left: "50%", width: `${addWidth}px` }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <AuthorDots authors={authors} />
      </div>
    </button>
  );
}

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { TimelineNode } from "@/lib/timeline/types";

const ROW = 92; // px height per commit row
const GUTTER = 112; // px width of the graph gutter
const LANE_X = [52, 84]; // x of lane 0 (main) and lane 1 (feature)
const DOT_R = 5;

const COLORS = {
  mainRail: "#3f3f46",
  featureRail: "#ff4d2e",
  mainDotFill: "#09090b",
  mainDotStroke: "#52525b",
  featureDot: "#ff4d2e",
  mergeStroke: "#ff4d2e",
  activeDot: "#ff4d2e",
};

function yCenter(i: number) {
  return i * ROW + ROW / 2;
}

/** S-curve between two lane points. */
function sCurve(x0: number, y0: number, x1: number, y1: number) {
  const ym = (y0 + y1) / 2;
  return `M ${x0} ${y0} C ${x0} ${ym} ${x1} ${ym} ${x1} ${y1}`;
}

export function TimelineGraph({
  nodes,
  owner,
  name,
  activeSha,
  chatShas = [],
}: {
  nodes: TimelineNode[];
  owner: string;
  name: string;
  activeSha?: string;
  /** SHAs that already have a saved chat for the current user. */
  chatShas?: string[];
}) {
  const height = nodes.length * ROW;
  const chatSet = new Set(chatShas);

  const lane0 = nodes.map((n, i) => (n.lane === 0 ? i : -1)).filter((i) => i >= 0);
  const lane1 = nodes.map((n, i) => (n.lane === 1 ? i : -1)).filter((i) => i >= 0);

  const mainTop = Math.min(...lane0);
  const mainBottom = Math.max(...lane0);

  const hasFeature = lane1.length > 0;
  const fNewest = hasFeature ? Math.min(...lane1) : -1;
  const fOldest = hasFeature ? Math.max(...lane1) : -1;
  const baseIndex = hasFeature ? fOldest + 1 : -1; // main commit the branch left from
  const mergeIndex = nodes.findIndex((n) => n.type === "merge");

  return (
    <div className="relative">
      <svg
        width={GUTTER}
        height={height}
        className="absolute left-0 top-0"
        aria-hidden
      >
        {/* main rail */}
        <line
          x1={LANE_X[0]}
          y1={yCenter(mainTop)}
          x2={LANE_X[0]}
          y2={yCenter(mainBottom)}
          stroke={COLORS.mainRail}
          strokeWidth={2}
        />

        {hasFeature && (
          <>
            {/* feature rail */}
            <line
              x1={LANE_X[1]}
              y1={yCenter(fNewest)}
              x2={LANE_X[1]}
              y2={yCenter(fOldest)}
              stroke={COLORS.featureRail}
              strokeWidth={2}
              opacity={0.85}
            />
            {/* diverge: base (main) -> oldest feature commit */}
            {baseIndex < nodes.length && (
              <path
                d={sCurve(LANE_X[0], yCenter(baseIndex), LANE_X[1], yCenter(fOldest))}
                fill="none"
                stroke={COLORS.featureRail}
                strokeWidth={2}
                opacity={0.85}
              />
            )}
            {/* merge: newest feature commit -> merge commit (main) */}
            {mergeIndex >= 0 && (
              <path
                d={sCurve(LANE_X[1], yCenter(fNewest), LANE_X[0], yCenter(mergeIndex))}
                fill="none"
                stroke={COLORS.mergeStroke}
                strokeWidth={2}
              />
            )}
          </>
        )}

        {/* nodes */}
        {nodes.map((n, i) => {
          const x = LANE_X[n.lane];
          const y = yCenter(i);
          const isActive = n.sha === activeSha;
          if (n.type === "merge") {
            return (
              <circle key={n.sha} cx={x} cy={y} r={DOT_R + 1} fill={isActive ? COLORS.activeDot : COLORS.mainDotFill} stroke={COLORS.mergeStroke} strokeWidth={2.5} />
            );
          }
          if (n.lane === 1) {
            return <circle key={n.sha} cx={x} cy={y} r={DOT_R} fill={COLORS.featureDot} />;
          }
          return (
            <circle key={n.sha} cx={x} cy={y} r={DOT_R} fill={isActive ? COLORS.activeDot : COLORS.mainDotFill} stroke={isActive ? COLORS.activeDot : COLORS.mainDotStroke} strokeWidth={2} />
          );
        })}
      </svg>

      <ul>
        {nodes.map((n) => (
          <li
            key={n.sha}
            style={{ height: ROW, paddingLeft: GUTTER }}
            className={`border-b border-border/40 transition-colors last:border-b-0 ${
              n.sha === activeSha
                ? "bg-vermillion/5 shadow-[inset_3px_0_0_0_var(--color-vermillion)]"
                : "hover:bg-accent/40"
            }`}
          >
            <Link
              href={`/repos/${owner}/${name}?commit=${n.sha}`}
              scroll={false}
              aria-current={n.sha === activeSha ? "true" : undefined}
              className="group flex h-full min-w-0 items-center gap-4 pr-4 sm:pr-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <code className="rounded border border-border bg-card/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {n.sha}
                  </code>
                  {n.type === "merge" && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-vermillion">
                      merge
                    </span>
                  )}
                  {n.lane === 1 && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {n.branch}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1.5 truncate text-sm ${
                    n.type === "merge" ? "italic text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {n.message}
                </p>
              </div>

              <div className="hidden items-center gap-2.5 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-foreground">
                  {n.author.initials}
                </span>
                <span className="w-24 truncate text-xs text-muted-foreground">
                  {n.author.name}
                </span>
              </div>

              <span className="hidden w-20 shrink-0 text-right font-mono text-xs text-zinc-600 md:block">
                {relativeTime(n.date)}
              </span>

              <div className="flex w-[88px] shrink-0 justify-end">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    n.sha === activeSha
                      ? "border-vermillion/60 bg-vermillion/10 text-vermillion"
                      : chatSet.has(n.sha)
                        ? "border-vermillion/40 bg-card/50 text-foreground group-hover:border-vermillion/60"
                        : "border-border bg-card/50 text-muted-foreground group-hover:border-vermillion/50 group-hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  chat
                  {chatSet.has(n.sha) && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-vermillion"
                      aria-label="has saved chat"
                    />
                  )}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

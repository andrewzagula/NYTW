import { cn } from "@/lib/utils";
import { scoreClasses, scoreTier } from "@/lib/format";
import { CornerBracket } from "./corner-bracket";

const borderByTier = {
  low: "border-score-low/50",
  mid: "border-score-mid/50",
  high: "border-score-high/50",
} as const;

type ScoreChipProps = {
  score: number | null;
  className?: string;
};

/** Corner-bracketed comprehension score, or a muted marker when ungated. */
export function ScoreChip({ score, className }: ScoreChipProps) {
  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        no gate
      </span>
    );
  }

  const tier = scoreTier(score);
  const c = scoreClasses[tier];

  return (
    <CornerBracket
      color={borderByTier[tier]}
      size="sm"
      className={cn("inline-flex", className)}
    >
      <span className="inline-flex items-baseline gap-0.5 px-2 py-1 font-mono text-xs tabular-nums">
        <span className={cn("text-sm font-semibold", c.text)}>{score}</span>
        <span className="text-muted-foreground">/100</span>
      </span>
    </CornerBracket>
  );
}

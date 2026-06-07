import { cn } from "@/lib/utils";

type CornerBracketProps = {
  children: React.ReactNode;
  /** Tailwind border-color class for the corner strokes. */
  color?: string;
  /** Corner stroke length. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Draws thin L-shaped strokes at the four corners of its content
 * (HydraDB-style framing) rather than a full border.
 */
export function CornerBracket({
  children,
  color = "border-vermillion",
  size = "md",
  className,
}: CornerBracketProps) {
  const len = size === "sm" ? "h-2 w-2" : "h-3 w-3";
  const corner = cn("pointer-events-none absolute", len, color);
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden className={cn(corner, "left-0 top-0 border-l border-t")} />
      <span aria-hidden className={cn(corner, "right-0 top-0 border-r border-t")} />
      <span aria-hidden className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span aria-hidden className={cn(corner, "bottom-0 right-0 border-b border-r")} />
      {children}
    </div>
  );
}

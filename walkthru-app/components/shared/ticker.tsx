import { cn } from "@/lib/utils";

type TickerProps = {
  items: string[];
  className?: string;
};

function TickerRow({ items, ariaHidden }: { items: string[]; ariaHidden?: boolean }) {
  return (
    <ul aria-hidden={ariaHidden} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <li
          key={`${item}-${i}`}
          className="flex items-center gap-4 whitespace-nowrap px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <span className="text-vermillion">·</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** RIG-style marquee of mono uppercase value-props separated by a vermillion dot. */
export function Ticker({ items, className }: TickerProps) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden border-y border-border bg-card/40 py-3",
        className,
      )}
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max animate-ticker">
        <TickerRow items={items} />
        <TickerRow items={items} ariaHidden />
      </div>
    </div>
  );
}

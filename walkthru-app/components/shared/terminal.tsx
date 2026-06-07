import { cn } from "@/lib/utils";

type TerminalProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Faux terminal frame: window chrome + mono body. */
export function Terminal({
  title = "walkthru",
  children,
  className,
  bodyClassName,
}: TerminalProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-[#0b0b0d] shadow-2xl shadow-black/40",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 bg-card/50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#3a3a3e]" />
        <span className="h-3 w-3 rounded-full bg-[#3a3a3e]" />
        <span className="h-3 w-3 rounded-full bg-[#3a3a3e]" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          {title}
        </span>
      </div>
      <div
        className={cn(
          "p-5 font-mono text-[13px] leading-relaxed sm:p-6",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

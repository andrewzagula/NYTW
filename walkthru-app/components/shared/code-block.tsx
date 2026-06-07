import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

type CodeBlockProps = {
  code: string;
  /** Filename or language tag shown in the header bar. */
  label?: string;
  className?: string;
};

export function CodeBlock({ code, label = "bash", className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-[#0b0b0d]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-card/40 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <CopyButton text={code} className="text-muted-foreground hover:text-foreground" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

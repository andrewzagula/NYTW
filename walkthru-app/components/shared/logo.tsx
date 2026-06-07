import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  /** "light" = white text + vermillion mark (on dark). "ink" = all near-black (on the red hero). */
  tone?: "light" | "ink";
  className?: string;
};

export function Logo({ href = "/", tone = "light", className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight",
        tone === "ink" ? "text-hero-ink" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "text-base leading-none transition-transform group-hover:rotate-90",
          tone === "ink" ? "text-hero-ink" : "text-vermillion",
        )}
      >
        ◢
      </span>
      <span>walkthru</span>
    </Link>
  );
}

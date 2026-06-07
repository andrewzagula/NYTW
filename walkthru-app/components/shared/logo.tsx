import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  /** "light" = red mark + white wordmark (on dark). "ink" = black mark + black wordmark (on the red hero). */
  tone?: "light" | "ink";
  className?: string;
};

export function Logo({ href = "/", tone = "light", className }: LogoProps) {
  const ink = tone === "ink";
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight",
        ink ? "text-hero-ink" : "text-foreground",
        className,
      )}
    >
      <Image
        src={ink ? "/walkthru.png" : "/walkthru_red.png"}
        alt="Walkthru"
        width={30}
        height={20}
        priority
        className={cn(
          "h-[18px] w-auto transition-transform group-hover:scale-110",
          // The white mark rendered black to match the all-black hero header.
          ink && "brightness-0",
        )}
      />
      <span>walkthru</span>
    </Link>
  );
}

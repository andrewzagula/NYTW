"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

type SiteHeaderProps = {
  /** When true the header overlays the red hero until the user scrolls. */
  overHero?: boolean;
};

const NAV = [
  { label: "Docs", href: "/docs" },
  { label: "CLI", href: "/docs#install" },
];

export function SiteHeader({ overHero = false }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onRed = overHero && !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        onRed
          ? "border-b border-transparent"
          : "border-b border-border bg-background/80 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo tone={onRed ? "ink" : "light"} />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "font-mono text-xs uppercase tracking-widest transition-colors",
                onRed
                  ? "text-hero-ink/70 hover:text-hero-ink"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/signin"
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              onRed
                ? "bg-hero-ink text-zinc-50 hover:bg-black"
                : "bg-vermillion text-hero-ink hover:bg-vermillion-deep",
            )}
          >
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className={cn(
            "md:hidden",
            onRed ? "text-hero-ink" : "text-foreground",
          )}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-md bg-vermillion px-4 py-2 text-center text-sm font-medium text-hero-ink"
            >
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

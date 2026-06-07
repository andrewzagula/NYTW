"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type DocSection = { id: string; label: string };

export function DocsSidebar({ sections }: { sections: DocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Documentation" className="text-sm">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Documentation
      </p>
      <ul className="space-y-1 border-l border-border">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "-ml-px block border-l py-1.5 pl-4 transition-colors",
                active === s.id
                  ? "border-vermillion font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

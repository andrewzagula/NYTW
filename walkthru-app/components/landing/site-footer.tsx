import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Install the CLI", href: "/docs#install" },
      { label: "Sign in", href: "/signin" },
    ],
  },
  {
    title: "Surfaces",
    links: [
      { label: "Web dashboard", href: "/dashboard" },
      { label: "CLI gate", href: "/docs#gate" },
      { label: "Configuration", href: "/docs#config" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A comprehension layer on top of your git history. For teams tired of
            shipping code nobody understands.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {col.title}
            </p>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-vermillion"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Walkthru</span>
          <span className="text-zinc-600">
            Built with comprehension-gated commits.
          </span>
        </div>
      </div>
    </footer>
  );
}

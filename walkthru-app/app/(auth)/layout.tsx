import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-50" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #ff4d2e, transparent)" }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-600">
          <Link href="/" className="transition-colors hover:text-muted-foreground">
            ← back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

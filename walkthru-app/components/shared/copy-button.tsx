"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  /** Optional label rendered next to the icon. */
  label?: string;
  className?: string;
};

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy ${label ?? text}`}
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs transition-colors",
        className,
      )}
    >
      {label ? <span>{label}</span> : null}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-score-high" />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-70" />
      )}
    </button>
  );
}

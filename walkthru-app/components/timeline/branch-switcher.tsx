"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, GitBranch } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BranchSwitcher({
  branches,
  defaultBranch,
  selectedBranch,
}: {
  branches: string[];
  defaultBranch: string;
  selectedBranch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = selectedBranch ?? searchParams.get("branch") ?? defaultBranch;

  function selectBranch(branch: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branch);
    params.delete("commit");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono">{selected}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {branches.map((b) => (
          <DropdownMenuItem
            key={b}
            onClick={() => selectBranch(b)}
            className="font-mono text-sm"
          >
            {b}
            {b === selected && <Check className="ml-auto h-4 w-4 text-vermillion" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { MessageSquare, PanelRightClose, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatConversation } from "./chat-conversation";

type ChatPanelProps = {
  owner: string;
  name: string;
  commitSha: string | null;
  mode: "general" | "commit";
  header: string;
  commitMessage?: string | null;
  suggestions: string[];
  /** Saved thread for this commit, restored on mount. */
  initialMessages?: UIMessage[];
};

export function ChatPanel({
  owner,
  name,
  commitSha,
  mode,
  header,
  commitMessage,
  suggestions,
  initialMessages,
}: ChatPanelProps) {
  const [collapsed, setCollapsed] = useState(false); // desktop
  const [openMobile, setOpenMobile] = useState(false); // drawer

  useEffect(() => {
    if (!openMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMobile(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMobile]);

  const panel = (
    <div className="flex h-full flex-col bg-card/20">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-vermillion">
            {mode === "commit" ? "Commit chat" : "Repo chat"}
          </p>
          <p className="truncate font-mono text-sm text-foreground">{header}</p>
          {mode === "commit" && commitMessage && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {commitMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setCollapsed(true);
            setOpenMobile(false);
          }}
          aria-label="Collapse chat"
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PanelRightClose className="hidden h-4 w-4 lg:block" />
          <X className="h-4 w-4 lg:hidden" />
        </button>
      </div>

      <ChatConversation
        owner={owner}
        name={name}
        commitSha={commitSha}
        mode={mode}
        suggestions={suggestions}
        initialMessages={initialMessages}
      />
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-l border-border lg:block",
          collapsed ? "lg:w-0 lg:border-l-0" : "lg:w-[400px]",
        )}
      >
        {!collapsed && (
          <div className="sticky top-16 h-[calc(100vh-4rem)]">{panel}</div>
        )}
      </aside>

      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-vermillion px-4 py-3 font-mono text-xs uppercase tracking-widest text-hero-ink shadow-lg lg:hidden"
      >
        <MessageSquare className="h-4 w-4" /> Ask
      </button>
      {openMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenMobile(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-background">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

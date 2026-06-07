"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import {
  ArrowLeft,
  Maximize2,
  MessageSquare,
  PanelRightClose,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatConversation } from "./chat-conversation";

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
const WIDTH_STORAGE_KEY = "walkthru:chat-width";

type ChatPanelProps = {
  owner: string;
  name: string;
  commitSha: string | null;
  defaultCommitSha?: string | null;
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
  defaultCommitSha,
  mode,
  header,
  commitMessage,
  suggestions,
  initialMessages,
}: ChatPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false); // desktop
  const [openMobile, setOpenMobile] = useState(false); // drawer
  const [fullscreen, setFullscreen] = useState(false); // desktop fullscreen
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return MIN_WIDTH + 80;
    const saved = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : MIN_WIDTH + 80;
  }); // desktop panel width (px)
  const resizingRef = useRef(false);

  // Persist width changes.
  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (!openMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMobile(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMobile]);

  // Drag-to-resize the desktop panel width.
  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizingRef.current) return;
      const next = window.innerWidth - e.clientX;
      const max = Math.min(MAX_WIDTH, window.innerWidth - 360);
      setWidth(Math.min(max, Math.max(MIN_WIDTH, next)));
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const repoChatHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("commit");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const commitChatHref = useMemo(() => {
    const sha = commitSha ?? defaultCommitSha;
    if (!sha) return null;
    const params = new URLSearchParams(searchParams.toString());
    params.set("commit", sha);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [commitSha, defaultCommitSha, pathname, searchParams]);

  const panel = (
    <div className="flex h-full flex-col bg-card/20">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          {commitChatHref && (
            <div className="mb-2 inline-flex rounded-md border border-border bg-card/40 p-0.5 font-mono text-[10px] uppercase tracking-widest">
              {mode === "general" ? (
                <span className="rounded bg-vermillion/10 px-2 py-1 text-vermillion">
                  Repo
                </span>
              ) : (
                <Link
                  href={repoChatHref}
                  scroll={false}
                  className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Repo
                </Link>
              )}
              {mode === "commit" ? (
                <span className="rounded bg-vermillion/10 px-2 py-1 text-vermillion">
                  Commit
                </span>
              ) : (
                <Link
                  href={commitChatHref}
                  scroll={false}
                  className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Commit
                </Link>
              )}
            </div>
          )}
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
        <div className="mt-0.5 flex shrink-0 items-center gap-3">
          {fullscreen ? (
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="Exit fullscreen"
              className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground lg:flex"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              aria-label="Fullscreen chat"
              className="hidden text-muted-foreground transition-colors hover:text-foreground lg:block"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCollapsed(true);
              setFullscreen(false);
              setOpenMobile(false);
            }}
            aria-label="Collapse chat"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <PanelRightClose className="hidden h-4 w-4 lg:block" />
            <X className="h-4 w-4 lg:hidden" />
          </button>
        </div>
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
          collapsed && "lg:w-0 lg:border-l-0",
        )}
        style={!collapsed && !fullscreen ? { width } : undefined}
      >
        {!collapsed && !fullscreen && (
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <div
              onPointerDown={startResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat"
              className="group absolute left-0 top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center"
            >
              <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-vermillion" />
            </div>
            {panel}
          </div>
        )}
      </aside>

      {fullscreen && !collapsed && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-30 hidden bg-background lg:block">
          {panel}
        </div>
      )}

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

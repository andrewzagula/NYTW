"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, MessageSquare, PanelRightClose, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./chat-message";

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
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport,
    messages: initialMessages,
  });
  const [input, setInput] = useState("");
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

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage(
      { text: t },
      { body: { owner, name, commitSha: commitSha ?? undefined } },
    );
    setInput("");
  }

  const panel = (
    <div className="flex h-full flex-col bg-card/20">
      {/* header */}
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

      {/* thread */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask anything about this {mode === "commit" ? "commit" : "repository"}.
              Answers are grounded in the connected repo.
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={`${i}-${s}`}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-card/40 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            <span className="text-muted-foreground">The assistant hit an error.</span>
            <button
              type="button"
              onClick={() => regenerate()}
              className="inline-flex items-center gap-1 font-mono text-xs text-vermillion hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 focus-within:border-vermillion/60">
          <textarea
            aria-label="Message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about this code…"
            className="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-vermillion text-hero-ink transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: sticky right column. top-16 / 4rem must match the (app) nav height — verify in app/(app)/layout.tsx. */}
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

      {/* Mobile (< lg): floating button + drawer */}
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

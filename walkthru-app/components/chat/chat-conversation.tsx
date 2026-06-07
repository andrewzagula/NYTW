"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, RotateCcw } from "lucide-react";
import { ChatMessage } from "./chat-message";

type Mode = "general" | "commit";

type ChatConversationProps = {
  owner: string;
  name: string;
  commitSha: string | null;
  mode: Mode;
  suggestions: string[];
  initialMessages?: UIMessage[];
  /** Tweak the placeholder for context (quiz follow-up vs generic). */
  placeholder?: string;
  /** Empty-state copy above the suggestion list. */
  emptyStateText?: string;
};

/**
 * The thread + composer body of the chat panel. No outer aside / drawer —
 * use this when embedding chat into a host like the QuizPanel.
 */
export function ChatConversation({
  owner,
  name,
  commitSha,
  mode,
  suggestions,
  initialMessages,
  placeholder,
  emptyStateText,
}: ChatConversationProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport,
    messages: initialMessages,
  });
  const [input, setInput] = useState("");
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {emptyStateText ??
                `Ask anything about this ${mode === "commit" ? "commit" : "repository"}. Answers are grounded in the connected repo.`}
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
            placeholder={placeholder ?? "Ask about this code…"}
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
}

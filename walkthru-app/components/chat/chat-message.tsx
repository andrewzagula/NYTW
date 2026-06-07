import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {isUser ? "you" : "◢ walkthru"}
      </span>
      <div
        className={cn(
          "max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-secondary text-foreground"
            : "border border-border bg-card/40 text-foreground",
        )}
      >
        {text || <span className="text-muted-foreground">…</span>}
      </div>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "whitespace-pre-wrap bg-secondary text-foreground"
            : "border border-border bg-card/40 text-foreground",
        )}
      >
        {text ? (
          isUser ? (
            text
          ) : (
            <div
              className={cn(
                "space-y-2",
                "[&_p]:leading-relaxed",
                "[&_p+p]:mt-2",
                "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
                "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
                "[&_li]:leading-relaxed",
                "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
                "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3",
                "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
                "[&_a]:text-vermillion [&_a]:underline [&_a]:underline-offset-2",
                "[&_strong]:font-semibold",
                "[&_em]:italic",
                "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-2",
                "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2",
                "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2",
                "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
                "[&_hr]:my-3 [&_hr]:border-border",
                "[&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
                "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
                "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )
        ) : (
          <span className="text-muted-foreground">…</span>
        )}
      </div>
    </div>
  );
}

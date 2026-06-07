import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getRepo } from "@/lib/mock/repos";
import { getCommit } from "@/lib/mock/timeline";
import {
  buildSystemPrompt,
  lastUserText,
  scriptedMockAnswer,
  type PerseusHit,
} from "@/lib/chat/context";
import { mockUIMessageResponse } from "@/lib/chat/mock-stream";
import { queryIndex } from "@/lib/perseus";

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

// claude-api skill default. Opus 4.8 rejects temperature/top_p/budget_tokens with
// a 400, so streamText is given only model/system/messages below.
const MODEL = process.env.WALKTHRU_CHAT_MODEL ?? "claude-opus-4-8";

type ChatRequest = {
  messages: UIMessage[];
  repoId?: string;
  commit?: string;
};

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }
  const { messages, repoId, commit } = body;
  if (!Array.isArray(messages)) {
    return new Response("messages must be an array.", { status: 400 });
  }

  const repo = repoId ? getRepo(repoId) : undefined;

  // Unknown repo → answer gracefully, never hard-fail.
  if (!repo) {
    return mockUIMessageResponse(
      "I couldn't find that repository, so I can't ground an answer in its code. Open a repo from the dashboard and try again.",
    );
  }

  const commitNode = commit ? getCommit(repo.id, commit) ?? null : null;
  const question = lastUserText(messages);

  // Real mode requires BOTH a key and a perseus index id for this repo.
  const realMode = Boolean(process.env.ANTHROPIC_API_KEY && repo.perseusIndexId);

  if (!realMode) {
    return mockUIMessageResponse(scriptedMockAnswer(repo, commitNode, question));
  }

  let hits: PerseusHit[] = [];
  // Re-check here: Boolean(...) above doesn't narrow string | undefined → string.
  if (repo.perseusIndexId) {
    // queryIndex never throws — a miss returns [] and we answer without code context.
    hits = await queryIndex(repo.perseusIndexId, question);
  }

  try {
    const result = streamText({
      model: anthropic(MODEL),
      system: buildSystemPrompt(repo, commitNode, hits),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
      onError: () => "The assistant hit an error. Please retry.",
    });
  } catch {
    // Setup-time failure (e.g. malformed messages) — degrade gracefully.
    return mockUIMessageResponse(
      "The assistant couldn't process this request. Please retry.",
    );
  }
}

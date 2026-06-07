import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getSessionUser, getGithubToken } from "@/lib/auth/server";
import { saveChatMessages } from "@/lib/db";
import { fetchRepoMeta, fetchCommitDiff } from "@/lib/github";
import {
  buildSystemPrompt,
  lastUserText,
  REPO_CHAT_THREAD_KEY,
  scriptedMockAnswer,
  type ChatCommit,
  type ChatRepo,
} from "@/lib/chat/context";
import { mockUIMessageResponse } from "@/lib/chat/mock-stream";
import { queryIndex } from "@/lib/perseus";

/**
 * Persist a chat thread, swallowing any DB error so a storage failure never
 * breaks the chat response. Commit chats are keyed by SHA; repo chat uses a
 * reserved synthetic key.
 */
async function persistThread(
  userId: string | undefined,
  repo: string,
  commitSha: string | undefined,
  messages: UIMessage[],
): Promise<void> {
  if (!userId) return;
  try {
    await saveChatMessages(userId, repo, commitSha ?? REPO_CHAT_THREAD_KEY, messages);
  } catch (err) {
    console.error("Failed to save chat thread", err);
  }
}

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

// claude-api skill default. Opus 4.8 rejects temperature/top_p/budget_tokens with
// a 400, so streamText is given only model/system/messages below.
const MODEL = process.env.WALKTHRU_CHAT_MODEL ?? "claude-opus-4-8";

const MAX_DIFF_CHARS = 12_000;

type ChatRequest = {
  messages: UIMessage[];
  owner?: string;
  name?: string;
  commitSha?: string;
};

function truncateDiff(detail: { files: Array<{ filename: string; patch: string | null }> }): string {
  const parts: string[] = [];
  let used = 0;
  for (const f of detail.files) {
    if (!f.patch) continue;
    const block = `--- ${f.filename} ---\n${f.patch}`;
    if (used + block.length > MAX_DIFF_CHARS) {
      parts.push(`(diff truncated; ${detail.files.length - parts.length} more files omitted)`);
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }
  const { messages, owner, name, commitSha } = body;
  if (!Array.isArray(messages)) {
    return new Response("messages must be an array.", { status: 400 });
  }
  if (!owner || !name) {
    return mockUIMessageResponse(
      "I don't know which repo you're asking about. Open a repo from the dashboard and try again.",
    );
  }

  const question = lastUserText(messages);
  const sessionUser = getSessionUser(req);
  const token = sessionUser ? await getGithubToken(sessionUser.id) : null;

  // Try to enrich with real GitHub data — fall back gracefully if we can't.
  let chatRepo: ChatRepo = { owner, name };
  let chatCommit: ChatCommit | null = null;

  if (token) {
    const meta = await fetchRepoMeta(owner, name, token);
    if (!("error" in meta)) {
      chatRepo = {
        owner: meta.owner,
        name: meta.name,
        description: meta.description,
        defaultBranch: meta.default_branch,
        language: meta.language,
      };
    }

    if (commitSha) {
      const detail = await fetchCommitDiff(owner, name, commitSha, token);
      if (!("error" in detail)) {
        chatCommit = {
          sha: detail.sha,
          message: detail.message,
          author: detail.author,
          diff: truncateDiff(detail),
        };
      } else {
        chatCommit = { sha: commitSha, message: "", author: "" };
      }
    }
  } else if (commitSha) {
    chatCommit = { sha: commitSha, message: "", author: "" };
  }

  const repo = `${owner}/${name}`;
  const realMode = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!realMode) {
    const answer = scriptedMockAnswer(chatRepo, chatCommit, question);
    await persistThread(sessionUser?.id, repo, commitSha, [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: answer }],
      },
    ]);
    return mockUIMessageResponse(answer);
  }

  // Ground the answer in retrieved code. queryIndex never throws — a miss or
  // auth/timeout failure returns an empty result and we answer from metadata +
  // diff alone. It also carries perseus's own answer, fed in as a starting point.
  const retrieval = await queryIndex(question);

  try {
    const result = streamText({
      model: anthropic(MODEL),
      system: buildSystemPrompt(chatRepo, chatCommit, retrieval),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: ({ messages: finalMessages }) => {
        void persistThread(sessionUser?.id, repo, commitSha, finalMessages);
      },
      onError: () => "The assistant hit an error. Please retry.",
    });
  } catch {
    return mockUIMessageResponse(
      "The assistant couldn't process this request. Please retry.",
    );
  }
}

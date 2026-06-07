import { simulateReadableStream } from "ai";

/**
 * Build AI SDK UI-message-stream SSE lines for a scripted answer. The wire
 * format matches `streamText(...).toUIMessageStreamResponse()` so the client
 * (`useChat`) consumes mock and real responses identically.
 * See node_modules/ai/docs/03-ai-sdk-core/55-testing.mdx.
 */
export function buildMockChunks(answer: string): string[] {
  const id = "0";
  // Split into word+trailing-whitespace runs so the answer reconstructs exactly.
  const words = answer.match(/\S+\s*|\s+/g) ?? [answer];
  return [
    `data: ${JSON.stringify({ type: "start" })}\n\n`,
    `data: ${JSON.stringify({ type: "text-start", id })}\n\n`,
    ...words.map(
      (delta) => `data: ${JSON.stringify({ type: "text-delta", id, delta })}\n\n`,
    ),
    `data: ${JSON.stringify({ type: "text-end", id })}\n\n`,
    `data: ${JSON.stringify({ type: "finish" })}\n\n`,
    `data: [DONE]\n\n`,
  ];
}

/** Stream a scripted answer as a UI-message-stream Response (mock mode). */
export function mockUIMessageResponse(answer: string): Response {
  return new Response(
    simulateReadableStream({
      initialDelayInMs: 150,
      chunkDelayInMs: 18,
      chunks: buildMockChunks(answer),
    }).pipeThrough(new TextEncoderStream()),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    },
  );
}

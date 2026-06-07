import "server-only";
import { queryIndex } from "@/lib/perseus";
import type { QuizSnippet } from "@/lib/db";
import type { GeneratedQuizQuestion } from "@/lib/quiz/generator";

/** How many perseus hits to attach per question. */
const SNIPPETS_PER_QUESTION = 3;

/**
 * Ground each generated quiz question in repository code by querying perseus
 * with the question text and attaching the top hits as that question's
 * snippets. The quiz UI (app/q/[sessionId]) renders these as "Relevant
 * Snippets" beneath each question.
 *
 * Never throws: queryIndex returns an empty result on any failure (missing
 * index id, auth expiry, timeout, network), so an ungrounded question simply
 * keeps its existing snippets ([] from the generator).
 */
export async function groundQuizWithPerseus(
  questions: GeneratedQuizQuestion[],
): Promise<GeneratedQuizQuestion[]> {
  return Promise.all(
    questions.map(async (q) => {
      const { hits } = await queryIndex(q.question, SNIPPETS_PER_QUESTION);
      if (hits.length === 0) return q;

      const snippets: QuizSnippet[] = hits.map((h) => ({
        path: h.path,
        lineStart: h.lineStart,
        lineEnd: h.lineEnd,
        snippet: h.snippet,
      }));
      return { ...q, snippets };
    }),
  );
}

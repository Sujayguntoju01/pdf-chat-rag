import type { Document } from "@langchain/core/documents";
import type { ChunkMetadata } from "./chunking";

export const SYSTEM_PROMPT = `You answer questions about a PDF document using ONLY the numbered sources provided.
- Cite every claim with the source number in square brackets, e.g. [1] or [2][3].
- If the sources do not contain the answer, say "I couldn't find that in the document." Do not guess.
- Be concise.`;

/** Render retrieved chunks as numbered sources: "[1] (page 3) ...". */
export function buildContext(docs: Document<ChunkMetadata>[]): string {
  return docs.map((d, i) => `[${i + 1}] (page ${d.metadata.page}) ${d.pageContent}`).join("\n\n");
}

export function buildUserMessage(question: string, docs: Document<ChunkMetadata>[]): string {
  return `Sources:\n${buildContext(docs)}\n\nQuestion: ${question}`;
}

export interface Citation {
  source: number;
  page: number;
  snippet: string;
}

/** Map the [n] markers the model used back to pages and text snippets. */
export function extractCitations(answer: string, docs: Document<ChunkMetadata>[]): Citation[] {
  const cited = new Set<number>();
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1]);
    if (n >= 1 && n <= docs.length) cited.add(n);
  }
  return [...cited]
    .sort((a, b) => a - b)
    .map((n) => {
      const doc = docs[n - 1];
      const text = doc.pageContent;
      return { source: n, page: doc.metadata.page, snippet: text.length > 220 ? `${text.slice(0, 220)}…` : text };
    });
}

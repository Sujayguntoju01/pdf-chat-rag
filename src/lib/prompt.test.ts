import { Document } from "@langchain/core/documents";
import { describe, expect, it } from "vitest";
import type { ChunkMetadata } from "./chunking";
import { buildContext, extractCitations } from "./prompt";

const docs = [
  new Document<ChunkMetadata>({ pageContent: "Revenue grew 12% in 2023.", metadata: { docId: "d", fileName: "f", page: 4 } }),
  new Document<ChunkMetadata>({ pageContent: "Costs were flat.", metadata: { docId: "d", fileName: "f", page: 9 } }),
];

describe("prompt helpers", () => {
  it("numbers sources with their pages", () => {
    expect(buildContext(docs)).toBe("[1] (page 4) Revenue grew 12% in 2023.\n\n[2] (page 9) Costs were flat.");
  });

  it("maps cited sources back to pages, ignoring duplicates and out-of-range markers", () => {
    const citations = extractCitations("Revenue grew [1] while costs held [2][1]. See [7].", docs);
    expect(citations).toEqual([
      { source: 1, page: 4, snippet: "Revenue grew 12% in 2023." },
      { source: 2, page: 9, snippet: "Costs were flat." },
    ]);
  });

  it("returns no citations when the model cites nothing", () => {
    expect(extractCitations("I couldn't find that in the document.", docs)).toEqual([]);
  });
});

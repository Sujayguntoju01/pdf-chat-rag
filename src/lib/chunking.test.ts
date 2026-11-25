import { describe, expect, it } from "vitest";
import { pagesToDocuments } from "./chunking";

describe("pagesToDocuments", () => {
  it("keeps the page number on every chunk and skips empty pages", async () => {
    const pages = ["a ".repeat(800), "", "Third page text."];
    const docs = await pagesToDocuments(pages, "doc-1", "test.pdf", { chunkSize: 500, chunkOverlap: 50 });

    expect(docs.length).toBeGreaterThan(2);
    expect(new Set(docs.map((d) => d.metadata.page))).toEqual(new Set([1, 3]));
    expect(docs.every((d) => d.metadata.docId === "doc-1" && d.metadata.fileName === "test.pdf")).toBe(true);
    expect(docs.every((d) => d.pageContent.length <= 500)).toBe(true);
  });
});

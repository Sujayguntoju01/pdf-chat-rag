import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface ChunkMetadata {
  docId: string;
  fileName: string;
  page: number;
}

/**
 * Split each page separately so every chunk keeps the page it came from.
 * That page number is what powers the citations in answers.
 */
export async function pagesToDocuments(
  pages: string[],
  docId: string,
  fileName: string,
  { chunkSize = 1000, chunkOverlap = 150 } = {},
): Promise<Document<ChunkMetadata>[]> {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  const docs: Document<ChunkMetadata>[] = [];
  for (const [i, text] of pages.entries()) {
    if (!text) continue;
    for (const chunk of await splitter.splitText(text)) {
      docs.push(new Document({ pageContent: chunk, metadata: { docId, fileName, page: i + 1 } }));
    }
  }
  return docs;
}

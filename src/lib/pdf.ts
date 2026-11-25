import { extractText, getDocumentProxy } from "unpdf";

/** Extract text from a PDF, one string per page (index 0 = page 1). */
export async function extractPages(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(data instanceof Uint8Array ? data : new Uint8Array(data));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((page) => page.replace(/\s+/g, " ").trim());
}

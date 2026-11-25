import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pagesToDocuments } from "@/lib/chunking";
import { extractPages } from "@/lib/pdf";
import { getVectorStore } from "@/lib/vectorstore";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a PDF in the 'file' field." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF must be 20 MB or smaller." }, { status: 413 });
  }

  const pages = await extractPages(await file.arrayBuffer());
  const docId = randomUUID();
  const docs = await pagesToDocuments(pages, docId, file.name);
  if (docs.length === 0) {
    return NextResponse.json(
      { error: "No text found. Scanned/image-only PDFs need OCR first." },
      { status: 422 },
    );
  }

  const store = await getVectorStore();
  await store.addDocuments(docs);

  return NextResponse.json({ docId, fileName: file.name, pages: pages.length, chunks: docs.length });
}

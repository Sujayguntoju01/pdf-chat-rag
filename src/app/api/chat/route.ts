import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Document } from "@langchain/core/documents";
import type { ChunkMetadata } from "@/lib/chunking";
import { getChatModel } from "@/lib/llm";
import { buildUserMessage, extractCitations, SYSTEM_PROMPT } from "@/lib/prompt";
import { getVectorStore } from "@/lib/vectorstore";

export const runtime = "nodejs";

const Body = z.object({
  docId: z.string().uuid(),
  question: z.string().trim().min(1).max(2000),
});

const TOP_K = 6;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send { docId, question }." }, { status: 400 });
  }
  const { docId, question } = parsed.data;

  const store = await getVectorStore();
  const docs = (await store.similaritySearch(question, TOP_K, { docId })) as Document<ChunkMetadata>[];
  if (docs.length === 0) {
    return NextResponse.json({ answer: "I couldn't find that in the document.", citations: [] });
  }

  const response = await getChatModel().invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(buildUserMessage(question, docs)),
  ]);
  const answer = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  return NextResponse.json({ answer, citations: extractCitations(answer, docs) });
}

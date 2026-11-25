import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

export function getEmbeddings() {
  return new OpenAIEmbeddings({ model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small" });
}

export function getChatModel() {
  return new ChatOpenAI({ model: process.env.CHAT_MODEL ?? "gpt-4o-mini", temperature: 0 });
}

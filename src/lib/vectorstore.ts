import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { Pool } from "pg";
import { EMBEDDING_DIMENSIONS, getEmbeddings } from "./llm";

export const TABLE_NAME = "pdf_chunks";

export function createVectorStore(embeddings: EmbeddingsInterface, pool: Pool, dimensions: number) {
  return PGVectorStore.initialize(embeddings, {
    pool,
    tableName: TABLE_NAME,
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    distanceStrategy: "cosine",
    dimensions,
  });
}

// Reuse one pool / store across hot reloads and requests.
const globalForDb = globalThis as unknown as { pool?: Pool; store?: Promise<PGVectorStore> };

export function getVectorStore(): Promise<PGVectorStore> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  globalForDb.pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  globalForDb.store ??= createVectorStore(getEmbeddings(), globalForDb.pool, EMBEDDING_DIMENSIONS);
  return globalForDb.store;
}

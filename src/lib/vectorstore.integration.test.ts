/**
 * Runs against a real Postgres + pgvector when TEST_DATABASE_URL is set
 * (CI starts one as a service). Uses a tiny deterministic embedding so no
 * OpenAI key is needed.
 */
import { Embeddings } from "@langchain/core/embeddings";
import { Pool } from "pg";
import type { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { afterAll, describe, expect, it } from "vitest";
import { pagesToDocuments } from "./chunking";
import { createVectorStore, TABLE_NAME } from "./vectorstore";

const DIMS = 64;

/** Bag-of-words hashed into 64 buckets: similar words -> similar vectors. */
class HashEmbeddings extends Embeddings {
  constructor() {
    super({});
  }
  private embed(text: string): number[] {
    const v = new Array(DIMS).fill(0);
    for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
      let h = 0;
      for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      v[h % DIMS] += 1;
    }
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  }
  async embedDocuments(texts: string[]) {
    return texts.map((t) => this.embed(t));
  }
  async embedQuery(text: string) {
    return this.embed(text);
  }
}

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("pgvector store (integration)", () => {
  const pool = new Pool({ connectionString: url });
  let store: PGVectorStore | undefined;

  afterAll(async () => {
    if (store) {
      await store.client?.query(`DROP TABLE IF EXISTS ${TABLE_NAME}`);
      await store.end(); // releases its client and closes the pool
    } else {
      await pool.end();
    }
  });

  it("retrieves only chunks from the requested document, with page numbers", async () => {
    await pool.query(`DROP TABLE IF EXISTS ${TABLE_NAME}`);
    store = await createVectorStore(new HashEmbeddings(), pool, DIMS);

    await store.addDocuments(
      await pagesToDocuments(
        ["Quarterly revenue grew because of strong cloud sales.", "The office cafeteria serves lunch daily."],
        "11111111-1111-4111-8111-111111111111",
        "report.pdf",
      ),
    );
    await store.addDocuments(
      await pagesToDocuments(
        ["Revenue from cloud sales also grew at a competitor."],
        "22222222-2222-4222-8222-222222222222",
        "other.pdf",
      ),
    );

    const results = await store.similaritySearch("why did revenue grow", 2, {
      docId: "11111111-1111-4111-8111-111111111111",
    });

    expect(results.length).toBe(2);
    expect(results.every((d) => d.metadata.fileName === "report.pdf")).toBe(true);
    expect(results[0].metadata.page).toBe(1);
  });
});

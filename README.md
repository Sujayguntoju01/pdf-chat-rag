# PDF Chat (RAG)

[![CI](https://github.com/Sujayguntoju01/pdf-chat-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/Sujayguntoju01/pdf-chat-rag/actions/workflows/ci.yml)

Upload a PDF and ask questions about it. Answers come **only from the document** and cite the **pages** they're based on, so you can check every claim.

Built with **Next.js, LangChain.js, PostgreSQL + pgvector and OpenAI**.

<!-- Add a screenshot or GIF: ![demo](docs/demo.gif) -->

## How it works

```
Upload PDF ──► extract text per page (unpdf) ──► split into chunks, keep page number
                                                        │
                                          embed (OpenAI) ▼
                                               PostgreSQL + pgvector
                                                        │
Question ──► embed ──► top-6 similar chunks (filtered to this document)
                                                        │
              numbered sources "[1] (page 4) ..." ──► LLM ──► answer with [n] citations
                                                        │
                                  map [n] back to page + snippet ──► UI
```

| Piece | File |
|---|---|
| Per-page text extraction | `src/lib/pdf.ts` |
| Chunking that keeps page metadata | `src/lib/chunking.ts` |
| pgvector store (cosine, 1536-dim) | `src/lib/vectorstore.ts` |
| Grounded prompt + citation mapping | `src/lib/prompt.ts` |
| Upload / chat API routes | `src/app/api/upload`, `src/app/api/chat` |
| Chat UI | `src/app/page.tsx` |

**Design choices**
- **Chunking page by page** means every chunk belongs to exactly one page, so each citation points to a real page.
- **Retrieval is filtered by document ID**, so answers never mix in other uploaded files.
- **The model must cite numbered sources and admit when the answer isn't there**, which cuts down on made-up answers.
- **Scanned PDFs are rejected** with a clear message instead of being silently indexed as empty.

## Run locally

Requires Node 20+, Docker and an OpenAI API key.

```bash
git clone https://github.com/Sujayguntoju01/pdf-chat-rag.git
cd pdf-chat-rag
cp .env.example .env.local        # add your OPENAI_API_KEY

docker compose up -d db           # Postgres + pgvector
npm install
npm run dev                       # http://localhost:3000
```

Or run everything in containers:

```bash
OPENAI_API_KEY=sk-... docker compose up --build
```

## API

```bash
curl -F "file=@report.pdf;type=application/pdf" localhost:3000/api/upload
# {"docId":"…","fileName":"report.pdf","pages":12,"chunks":41}

curl -X POST localhost:3000/api/chat -H 'content-type: application/json' \
  -d '{"docId":"…","question":"What drove revenue growth?"}'
# {"answer":"Revenue grew 12% due to cloud sales [1].","citations":[{"source":1,"page":4,"snippet":"…"}]}
```

## Tests

```bash
npm run lint && npm run typecheck && npm test
```

- Unit tests cover PDF page extraction, page-aware chunking and citation mapping.
- An integration test runs against a real Postgres + pgvector, using a small deterministic embedding instead of OpenAI. It checks that retrieval is filtered to one document and keeps page numbers. It runs when `TEST_DATABASE_URL` is set, and CI starts a pgvector service for it.

## Tech

Next.js 15 · React 19 · TypeScript · LangChain.js · OpenAI · PostgreSQL · pgvector · Tailwind CSS · Vitest · Docker · GitHub Actions

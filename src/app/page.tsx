"use client";

import { FormEvent, useRef, useState } from "react";

interface Citation {
  source: number;
  page: number;
  snippet: string;
}
interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
}
interface UploadedDoc {
  docId: string;
  fileName: string;
  pages: number;
  chunks: number;
}

export default function Home() {
  const [doc, setDoc] = useState<UploadedDoc | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState<"upload" | "chat" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy("upload");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setDoc(data);
      setMessages([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!doc || !question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy("chat");
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docId: doc.docId, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((m) => [...m, { role: "assistant", text: data.answer, citations: data.citations }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold">PDF Chat</h1>
        <p className="text-gray-500">Upload a PDF and ask questions. Answers cite the pages they come from.</p>
      </header>

      <section
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500"
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) upload(f);
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        {busy === "upload" ? (
          <p>Reading and indexing your PDF…</p>
        ) : doc ? (
          <p>
            <span className="font-semibold">{doc.fileName}</span> · {doc.pages} pages · {doc.chunks} chunks
            indexed. <span className="text-blue-600">Upload another</span>
          </p>
        ) : (
          <p>Drop a PDF here or click to upload</p>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="flex flex-1 flex-col gap-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 ${m.role === "user" ? "self-end bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}
          >
            <p className="whitespace-pre-wrap">{m.text}</p>
            {m.citations && m.citations.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-gray-300 pt-3 text-sm">
                {m.citations.map((c) => (
                  <li key={c.source}>
                    <span className="font-semibold">
                      [{c.source}] Page {c.page}:
                    </span>{" "}
                    <span className="text-gray-600">{c.snippet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy === "chat" && <p className="text-gray-500">Thinking…</p>}
      </section>

      <form onSubmit={ask} className="sticky bottom-4 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100"
          placeholder={doc ? "Ask a question about the document…" : "Upload a PDF first"}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!doc || busy !== null}
        />
        <button
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          disabled={!doc || busy !== null || !question.trim()}
        >
          Ask
        </button>
      </form>
    </main>
  );
}

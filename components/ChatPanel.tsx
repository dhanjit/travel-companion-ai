"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

export default function ChatPanel({
  messages,
  streaming,
  onSend,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    onSend(text);
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm">
      <header className="border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Companion
        </h2>
        <p className="text-xs text-stone-400">
          Ask for anything — it knows the travelers and the plan.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2 text-sm text-stone-400">
            <p>Try things like:</p>
            <ul className="list-disc pl-5">
              <li>&ldquo;Make day 2 more relaxed&rdquo;</li>
              <li>&ldquo;Find a vegetarian lunch stop instead&rdquo;</li>
              <li>&ldquo;We&apos;re running 2 hours late — fix today&rdquo;</li>
              <li>&ldquo;What should we pack?&rdquo;</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-2xl rounded-br-sm bg-amber-600 px-3 py-2 text-sm text-white"
                : "mr-6 whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-stone-100 px-3 py-2 text-sm text-stone-800"
            }
          >
            {m.content ||
              (m.role === "assistant" && streaming && i === messages.length - 1
                ? "…"
                : m.content)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-stone-100 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={streaming ? "Thinking…" : "Ask your companion…"}
            disabled={streaming}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-50"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </footer>
    </section>
  );
}

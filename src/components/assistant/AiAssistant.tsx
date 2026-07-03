"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantResponse = {
  data?: {
    reply: string;
    mode: "ai" | "basic";
  };
  error?: string;
};

const starters = [
  "Which car is best under RM 50k?",
  "Show me automatic petrol cars",
  "I want a family car"
];

const welcome: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I can help you shortlist cars from the showroom. Tell me your budget, fuel preference, or the type of car you want."
};

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submitMessage(message: string) {
    const trimmed = message.trim();

    if (!trimmed || isPending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-8)
        })
      });
      const result = (await response.json()) as AssistantResponse;

      if (!response.ok || !result.data?.reply) {
        setError(result.error ?? "Assistant is unavailable right now.");
        return;
      }

      const reply = result.data.reply;

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply
        }
      ]);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage(input);
  }

  function openAssistant() {
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section
          aria-label="Prestige Motors assistant"
          className="flex h-[min(680px,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-md border border-ink/10 bg-white shadow-[0_24px_90px_rgba(17,17,17,0.22)]"
        >
          <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10">
                <Sparkles className="h-4 w-4 text-champagne" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black">Prestige Assistant</h2>
                <p className="truncate text-xs text-white/58">Buyer concierge</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/72 transition hover:bg-white/10 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-smoke/55 px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[86%] whitespace-pre-line rounded-md px-3 py-2 text-sm leading-6 shadow-sm",
                    message.role === "user"
                      ? "bg-ink text-white"
                      : "border border-ink/10 bg-white text-ink/78"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isPending ? (
              <div className="flex justify-start">
                <div className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink/55 shadow-sm">
                  Checking showroom...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-ink/10 bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => submitMessage(starter)}
                  className="shrink-0 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/62 transition hover:border-copper/35 hover:text-ink"
                >
                  {starter}
                </button>
              ))}
            </div>

            {error ? <p className="mb-2 text-xs font-medium text-red-600">{error}</p> : null}

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about cars, budget, fuel..."
                className="h-11 min-w-0 flex-1 rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white"
              />
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-racing text-white transition hover:bg-racing/90 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={openAssistant}
          className="flex h-14 items-center gap-3 rounded-full bg-ink px-4 text-sm font-black text-white shadow-[0_18px_60px_rgba(17,17,17,0.24)] transition hover:-translate-y-0.5 hover:bg-graphite"
          aria-label="Open Prestige Motors assistant"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Ask AI</span>
          <MessageCircle className="h-4 w-4 sm:hidden" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

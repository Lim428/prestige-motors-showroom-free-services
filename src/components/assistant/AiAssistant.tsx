"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Bot, MessageCircle, Send, Sparkles, UserRound, X } from "lucide-react";
import { LeadCaptureCard } from "@/components/growth/LeadCaptureCard";
import { trackEngagement } from "@/lib/clientAnalytics";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantResponse = {
  data?: {
    reply: string;
    mode: "ai" | "basic";
    reason?: "not_configured" | "provider_error";
    carIds?: string[];
  };
  error?: string;
};

type AssistantDisplayMode = "ai" | "basic" | "unavailable" | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAssistantResponse(value: unknown): AssistantResponse {
  if (!isRecord(value)) {
    return {};
  }

  const error = typeof value.error === "string" ? value.error : undefined;

  if (!isRecord(value.data)) {
    return { error };
  }

  const reply = typeof value.data.reply === "string" ? value.data.reply.trim() : "";
  const mode = value.data.mode;

  if (!reply || (mode !== "ai" && mode !== "basic")) {
    return { error };
  }

  const reason =
    value.data.reason === "not_configured" || value.data.reason === "provider_error"
      ? value.data.reason
      : undefined;
  const carIds = Array.isArray(value.data.carIds)
    ? value.data.carIds.filter((carId): carId is string => typeof carId === "string").slice(0, 4)
    : undefined;

  return {
    data: {
      reply,
      mode,
      reason,
      carIds
    },
    error
  };
}

const starters = [
  "Best options under RM 50k",
  "Automatic daily drivers",
  "A comfortable family car"
];

const welcome: ChatMessage = {
  role: "assistant",
  content:
    "Welcome. Tell me your budget, preferred fuel type, or how you plan to use the car, and I’ll shortlist the strongest matches from our live showroom."
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function MessageContent({ content }: { content: string }) {
  return content.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
    if (!part.startsWith("http")) {
      return part;
    }

    const href = part.replace(/[),.;!?]+$/, "");
    const trailingPunctuation = part.slice(href.length);

    return (
      <span key={`${href}-${index}`}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-bold underline decoration-current/35 underline-offset-2 transition hover:decoration-current"
        >
          View vehicle
        </a>
        {trailingPunctuation}
      </span>
    );
  });
}

export function AiAssistant() {
  const pathname = usePathname();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantDisplayMode>(null);
  const [suggestedCarIds, setSuggestedCarIds] = useState<string[]>([]);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [assistantReason, setAssistantReason] = useState<
    "not_configured" | "provider_error" | null
  >(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef(false);
  const hasTrackedOpenRef = useRef(false);
  const titleId = useId();
  const inputHelpId = useId();
  const isVehicleDetail = pathname.startsWith("/cars/");

  useEffect(() => {
    function requestOpenFromNavigation(returnTarget?: HTMLElement | null) {
      returnFocusRef.current = returnTarget ?? launcherRef.current;
      setIsOpen(true);

      if (!hasTrackedOpenRef.current) {
        hasTrackedOpenRef.current = true;
        trackEngagement("AI_CHAT_STARTED");
      }
    }

    function locationRequestsAssistant() {
      const params = new URLSearchParams(window.location.search);

      if (params.get("assistant") === "open" || window.location.hash === "#assistant") {
        requestOpenFromNavigation(
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        );
      }
    }

    function onDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href]");

      if (!link || link.target === "_blank") {
        return;
      }

      const destination = new URL(link.href, window.location.href);

      if (
        destination.origin === window.location.origin &&
        (destination.searchParams.get("assistant") === "open" || destination.hash === "#assistant")
      ) {
        requestOpenFromNavigation(link);
      }
    }

    locationRequestsAssistant();
    window.addEventListener("popstate", locationRequestsAssistant);
    window.addEventListener("hashchange", locationRequestsAssistant);
    document.addEventListener("click", onDocumentClick);

    return () => {
      window.removeEventListener("popstate", locationRequestsAssistant);
      window.removeEventListener("hashchange", locationRequestsAssistant);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = returnFocusRef.current;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end"
    });
  }, [error, isOpen, isPending, messages]);

  async function submitMessage(message: string) {
    const trimmed = message.trim();

    if (!trimmed || requestInFlightRef.current) {
      return;
    }

    const history = messages.slice(1).slice(-8);
    requestInFlightRef.current = true;
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setInput("");
    setError("");
    setIsPending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          locale
        })
      });

      let result: AssistantResponse = {};

      try {
        result = parseAssistantResponse(await response.json());
      } catch {
        // A non-JSON upstream error is surfaced through the generic message below.
      }

      if (!response.ok || !result.data?.reply) {
        setAssistantMode("unavailable");
        setAssistantReason(null);
        setError(result.error ?? "The concierge is unavailable right now. Please try again.");
        return;
      }

      setAssistantMode(result.data.mode);
      setAssistantReason(result.data.reason ?? null);
      setSuggestedCarIds((current) =>
        Array.from(new Set([...current, ...(result.data?.carIds ?? [])])).slice(0, 4)
      );
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.data!.reply
        }
      ]);
    } catch {
      setAssistantMode("unavailable");
      setAssistantReason(null);
      setError("We could not reach the concierge. Check your connection and try again.");
    } finally {
      requestInFlightRef.current = false;
      setIsPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function openAssistant() {
    returnFocusRef.current = launcherRef.current;
    setIsOpen(true);

    if (!hasTrackedOpenRef.current) {
      hasTrackedOpenRef.current = true;
      trackEngagement("AI_CHAT_STARTED");
    }
  }

  function closeAssistant() {
    setIsOpen(false);
  }

  const bottomPosition = isVehicleDetail
    ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6"
    : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-6";

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close buyer concierge"
          onClick={closeAssistant}
          className="fixed inset-0 z-40 cursor-default bg-ink/55"
        />
      ) : null}

      <div id="assistant" className={cn("fixed right-3 z-50 sm:right-6", bottomPosition)}>
        {isOpen ? (
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "flex w-[calc(100vw-1.5rem)] max-w-[420px] flex-col overflow-hidden border border-ink bg-white shadow-[10px_10px_0_rgba(0,0,0,0.18)]",
              isVehicleDetail
                ? "h-[min(42rem,calc(100dvh-7rem-env(safe-area-inset-bottom)))] sm:h-[min(42rem,calc(100dvh-3rem))]"
                : "h-[min(42rem,calc(100dvh-1.5rem-env(safe-area-inset-bottom)))] sm:h-[min(42rem,calc(100dvh-3rem))]"
            )}
          >
            <header className="border-b-8 border-racing bg-ink px-4 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/25 bg-racing">
                    <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 id={titleId} className="truncate font-display text-xl font-black uppercase leading-none tracking-[0.02em]">
                      AI showroom assistant
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-white/60">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isPending
                            ? "animate-pulse bg-sky-300"
                            : assistantMode === "ai"
                              ? "bg-emerald-400"
                              : assistantMode === "basic"
                                ? "bg-amber-300"
                                : assistantMode === "unavailable"
                                  ? "bg-red-400"
                                  : "bg-white/35"
                        )}
                        aria-hidden="true"
                      />
                      {isPending
                        ? "Checking Gemini and live inventory"
                        : assistantMode === "ai"
                          ? "Gemini AI · live inventory"
                          : assistantMode === "basic"
                            ? "Inventory guide · AI offline"
                            : assistantMode === "unavailable"
                              ? "Assistant unavailable · please retry"
                              : "Live inventory · AI checked on reply"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAssistant}
                  className="grid h-10 w-10 shrink-0 place-items-center border border-white/20 text-white/70 transition hover:border-racing hover:bg-racing hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label="Close buyer concierge"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={isPending}
              aria-label="Conversation with the buyer concierge"
              className="flex-1 space-y-4 overflow-y-auto bg-smoke px-4 py-5"
            >
              {messages.map((chatMessage, index) => (
                <div
                  key={`${chatMessage.role}-${index}`}
                  className={cn(
                    "flex",
                    chatMessage.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] whitespace-pre-wrap break-words border px-3.5 py-2.5 text-sm leading-6",
                      chatMessage.role === "user"
                        ? "border-ink bg-ink text-white"
                        : "border-ink/15 bg-white text-ink/75"
                    )}
                  >
                    <MessageContent content={chatMessage.content} />
                  </div>
                </div>
              ))}

              {isPending ? (
                <div className="flex justify-start" role="status">
                  <div className="flex items-center gap-2 border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink/55">
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="h-1.5 w-1.5 animate-pulse bg-racing" />
                      <span className="h-1.5 w-1.5 animate-pulse bg-racing [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse bg-racing [animation-delay:240ms]" />
                    </span>
                    Checking the showroom
                  </div>
                </div>
              ) : null}

              {messages.some((message) => message.role === "user") ? (
                showLeadCapture ? (
                  <LeadCaptureCard
                    transcript={messages.slice(1)}
                    vehicleIds={suggestedCarIds}
                    className="shadow-none"
                    onSuccess={() => setShowLeadCapture(true)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLeadCapture(true)}
                    className="flex w-full items-center gap-3 border border-ink/15 bg-white p-3 text-left transition hover:border-racing hover:bg-racing/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/25"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-racing text-white">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-ink">
                        Continue with the showroom
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink/55">
                        Send this conversation so you do not need to repeat it.
                      </span>
                    </span>
                  </button>
                )
              ) : null}

              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            <footer className="border-t border-ink/10 bg-white px-3 pb-3 pt-3">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Suggested questions">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={isPending}
                    onClick={() => void submitMessage(starter)}
                    className="shrink-0 border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink/60 transition hover:border-racing hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/20 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {starter}
                  </button>
                ))}
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mb-2 border-l-4 border-red-700 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700"
                >
                  {error}
                </p>
              ) : null}

              {assistantMode === "basic" ? (
                <p className="mb-2 border-l-4 border-amber-600 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                  {assistantReason === "not_configured"
                    ? "Gemini is not connected to this deployment yet. This answer uses the current showroom data."
                    : "Gemini is temporarily unavailable. This answer uses the current showroom data."}
                </p>
              ) : null}

              <form onSubmit={onSubmit} className="flex gap-2">
                <label htmlFor={`${inputHelpId}-input`} className="sr-only">
                  Ask the buyer concierge
                </label>
                <input
                  id={`${inputHelpId}-input`}
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={800}
                  autoComplete="off"
                  enterKeyHint="send"
                  aria-describedby={inputHelpId}
                  placeholder="Budget, fuel, family needs..."
                  className="h-12 min-w-0 flex-1 border border-ink/20 bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20"
                />
                <button
                  type="submit"
                  disabled={isPending || !input.trim()}
                  className="grid h-12 w-12 shrink-0 place-items-center bg-racing text-white transition hover:bg-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
              <p id={inputHelpId} className="mt-2 text-center text-[11px] leading-4 text-ink/40">
                Recommendations use current listings. Confirm final availability with the showroom.
              </p>
            </footer>
          </section>
        ) : (
          <button
            ref={launcherRef}
            type="button"
            onClick={openAssistant}
            className="group flex h-14 items-center gap-3 border border-white/10 bg-ink px-3 pr-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[6px_6px_0_rgba(226,27,35,0.9)] transition hover:bg-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/35 focus-visible:ring-offset-2"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-label="Open buyer concierge"
          >
            <span className="grid h-9 w-9 place-items-center bg-racing text-white transition group-hover:bg-white group-hover:text-ink">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Ask concierge</span>
            <MessageCircle className="h-4 w-4 sm:hidden" aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}

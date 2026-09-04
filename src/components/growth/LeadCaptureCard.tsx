"use client";

import { FormEvent, useId, useState } from "react";
import { CheckCircle2, MessageSquareText, Send, ShieldCheck, Sparkles } from "lucide-react";
import { apiErrorMessage } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

type LeadMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LeadCaptureCardProps = {
  transcript?: LeadMessage[];
  vehicleIds?: string[];
  summary?: string;
  className?: string;
  onSuccess?: (leadId: string) => void;
};

type SubmissionState = "idle" | "success" | "error";

const fieldClass =
  "mt-2 h-12 w-full border border-ink/20 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20";

export function LeadCaptureCard({
  transcript = [],
  vehicleIds = [],
  summary,
  className,
  onSuccess
}: LeadCaptureCardProps) {
  const id = useId();
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setState("idle");
    setMessage("");
    setIsPending(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone") || undefined,
          consent: formData.get("consent") === "on",
          vehicleIds: vehicleIds.slice(0, 4),
          summary: summary?.trim().slice(0, 3000),
          transcript: transcript
            .filter((item) => item.content.trim())
            .slice(-30)
            .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1200) }))
        })
      });

      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "We could not pass this conversation to the showroom."));
      }

      const result = (await response.json()) as { data?: { id?: string } };
      const leadId = result.data?.id ?? "";

      form.reset();
      setState("success");
      setMessage("Your conversation is with the showroom team. They will contact you shortly.");
      onSuccess?.(leadId);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not send your details. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "overflow-hidden border border-ink/15 bg-white",
        className
      )}
    >
      <div className="border-b-8 border-racing bg-ink p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/25 bg-racing text-white">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-white/60">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Continue with a person
            </p>
            <h2 id={`${id}-title`} className="mt-3 font-display text-2xl font-black uppercase leading-none tracking-[-0.02em]">
              Send this chat to the showroom
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              No need to repeat yourself. A specialist receives your conversation and preferred
              vehicles with your contact details.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} aria-busy={isPending} className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${id}-name`}>
            <span className="text-sm font-bold text-ink/75">Your name</span>
            <input
              id={`${id}-name`}
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              enterKeyHint="next"
              className={fieldClass}
            />
          </label>
          <label htmlFor={`${id}-phone`}>
            <span className="text-sm font-bold text-ink/75">
              Phone <span className="font-normal text-ink/40">(optional)</span>
            </span>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="next"
              className={fieldClass}
            />
          </label>
          <label htmlFor={`${id}-email`} className="sm:col-span-2">
            <span className="text-sm font-bold text-ink/75">Email</span>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              maxLength={160}
              autoComplete="email"
              inputMode="email"
              enterKeyHint="done"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 border-l-4 border-ink bg-smoke p-4">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 border-ink/20 accent-racing"
          />
          <span className="text-xs leading-5 text-ink/60">
            I agree that Prestige Motors may contact me about this request. My chat and selected
            vehicles will be included so the team can help efficiently.
          </span>
        </label>

        {message ? (
          <div
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
            className={cn(
              "mt-4 border-l-4 px-4 py-3 text-sm font-semibold leading-6",
              state === "success" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-700 bg-red-50 text-red-700"
            )}
          >
            <span className="flex items-start gap-2">
              {state === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : null}
              {message}
            </span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || state === "success"}
          className={cn(
            "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.08em] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
            state === "success"
              ? "bg-emerald-700 focus-visible:ring-emerald-500/30"
              : "bg-racing hover:bg-copper focus-visible:ring-racing/30"
          )}
        >
          {state === "success" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? "Sending securely..." : state === "success" ? "Sent to showroom" : "Ask the team to contact me"}
        </button>

        <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-ink/45">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Your information is used only to respond to this vehicle request.
        </p>
      </form>
    </section>
  );
}

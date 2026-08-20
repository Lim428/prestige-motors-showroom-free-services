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
  "mt-2 h-12 w-full rounded-xl border border-ink/10 bg-smoke px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-racing/20";

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
        "overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white shadow-panel",
        className
      )}
    >
      <div className="border-b border-ink/10 bg-[linear-gradient(135deg,#171714_0%,#272621_100%)] p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-champagne text-ink">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-champagne">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Continue with a person
            </p>
            <h2 id={`${id}-title`} className="mt-2 text-xl font-black tracking-tight">
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

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-smoke p-4">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/20"
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
              "mt-4 rounded-xl px-4 py-3 text-sm font-semibold leading-6",
              state === "success" ? "bg-racing/10 text-racing" : "bg-red-50 text-red-700"
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
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-racing px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-racing/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
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

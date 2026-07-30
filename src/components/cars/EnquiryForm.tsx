"use client";

import { FormEvent, useId, useState } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";
import type { CarStatus } from "@prisma/client";
import { Button } from "@/components/ui/Button";

type State = "idle" | "success" | "error";

const enquiryContent: Record<
  CarStatus,
  { eyebrow: string; title: string; copy: string; button: string; message: string }
> = {
  AVAILABLE: {
    eyebrow: "Private viewing",
    title: "Experience it in person",
    copy: "Tell us how to reach you and the showroom team will help arrange the next step.",
    button: "Request a viewing",
    message: "I would like to arrange a viewing for the"
  },
  RESERVED: {
    eyebrow: "Priority list",
    title: "Check current availability",
    copy: "This vehicle is reserved. We can confirm its status or suggest the closest match.",
    button: "Check availability",
    message: "Please let me know if the reservation changes for the"
  },
  SOLD: {
    eyebrow: "Personal sourcing",
    title: "Looking for something similar?",
    copy: "Share your details and the showroom team can help source a comparable vehicle.",
    button: "Find a similar car",
    message: "Please help me find a vehicle similar to the"
  }
};

export function EnquiryForm({
  carId,
  carName,
  carStatus = "AVAILABLE"
}: {
  carId: string;
  carName: string;
  carStatus?: CarStatus;
}) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const fieldId = useId();
  const content = enquiryContent[carStatus];

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
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          message: formData.get("message"),
          carId
        })
      });

      let result: { error?: string } = {};

      try {
        result = (await response.json()) as { error?: string };
      } catch {
        // A non-JSON upstream error is handled by the response status below.
      }

      if (!response.ok) {
        setState("error");
        setMessage(result.error ?? "Your enquiry could not be sent.");
        return;
      }

      form.reset();
      setState("success");
      setMessage("Request received. The showroom team will be in touch.");
    } catch {
      setState("error");
      setMessage("We could not send your request. Please try again or contact the dealer directly.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      id="enquiry"
      onSubmit={onSubmit}
      aria-busy={isPending}
      className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-panel sm:p-6"
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-copper">
        {content.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">{content.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">{content.copy}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${fieldId}-name`}>
          <span className="text-sm font-bold text-ink/75">
            Your name
          </span>
          <input
            id={`${fieldId}-name`}
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            enterKeyHint="next"
            className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-smoke px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-ink/15"
          />
        </label>
        <label htmlFor={`${fieldId}-email`}>
          <span className="text-sm font-bold text-ink/75">
            Email
          </span>
          <input
            id={`${fieldId}-email`}
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-smoke px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-ink/15"
          />
        </label>
        <label htmlFor={`${fieldId}-phone`} className="sm:col-span-2">
          <span className="text-sm font-bold text-ink/75">
            Phone <span className="font-normal text-ink/40">(optional)</span>
          </span>
          <input
            id={`${fieldId}-phone`}
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="next"
            className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-smoke px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-ink/15"
          />
        </label>
        <label htmlFor={`${fieldId}-message`} className="sm:col-span-2">
          <span className="text-sm font-bold text-ink/75">
            How can we help?
          </span>
          <textarea
            id={`${fieldId}-message`}
            name="message"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            defaultValue={`${content.message} ${carName}.`}
            className="mt-2 w-full resize-y rounded-xl border border-ink/10 bg-smoke px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-ink/15"
          />
        </label>
      </div>

      {message ? (
        <div
          role={state === "error" ? "alert" : "status"}
          aria-live={state === "error" ? "assertive" : "polite"}
          className={
            state === "success"
              ? "mt-4 flex items-start gap-2 rounded-xl bg-racing/10 px-4 py-3 text-sm font-semibold leading-6 text-racing"
              : "mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
          }
        >
          {state === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : null}
          <span>{message}</span>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-5 w-full"
        icon={<Send className="h-4 w-4" />}
      >
        {isPending ? "Sending securely..." : content.button}
      </Button>

      <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-ink/45">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Your details go directly to the showroom and are only used to respond to this request.
      </p>
    </form>
  );
}

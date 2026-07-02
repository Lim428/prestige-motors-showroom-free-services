"use client";

import { FormEvent, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

type State = "idle" | "success" | "error";

export function EnquiryForm({ carId, carName }: { carId: string; carName: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setState("idle");
      setMessage("");

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

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setState("error");
        setMessage(result.error ?? "Your enquiry could not be sent.");
        return;
      }

      form.reset();
      setState("success");
      setMessage("Thanks. The dealer team will get back to you shortly.");
    });
  }

  return (
    <form
      id="enquiry"
      onSubmit={onSubmit}
      className="rounded-md border border-ink/10 bg-white p-5 shadow-panel"
    >
      <h2 className="text-xl font-black text-ink">Ask about this vehicle</h2>
      <p className="mt-1 text-sm text-ink/55">{carName}</p>

      <div className="mt-5 grid gap-3">
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Name
          </span>
          <input
            name="name"
            required
            minLength={2}
            className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Phone
          </span>
          <input
            name="phone"
            className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Message
          </span>
          <textarea
            name="message"
            required
            minLength={10}
            rows={4}
            defaultValue={`I would like to know more about the ${carName}.`}
            className="mt-2 w-full resize-y rounded-md border border-ink/10 bg-smoke px-3 py-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
      </div>

      {message ? (
        <p
          className={
            state === "success"
              ? "mt-4 text-sm font-medium text-racing"
              : "mt-4 text-sm font-medium text-red-600"
          }
        >
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-5 w-full"
        icon={<Send className="h-4 w-4" />}
      >
        {isPending ? "Sending..." : "Send enquiry"}
      </Button>
    </form>
  );
}

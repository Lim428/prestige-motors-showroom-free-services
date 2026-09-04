"use client";

import { FormEvent, useId, useState } from "react";
import { BellRing, CheckCircle2, Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { apiErrorMessage } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

type AlertChannel = "EMAIL" | "SMS" | "WHATSAPP";
type AlertType = "PRICE_DROP" | "NEW_STOCK" | "BOTH";

export type StockAlertFormProps = {
  carId?: string;
  initialBrand?: string;
  initialModel?: string;
  initialMaxPrice?: number;
  className?: string;
  compact?: boolean;
  onSuccess?: (alertId: string) => void;
};

type FormState = "idle" | "success" | "error";

const fieldClass =
  "mt-2 h-12 w-full border border-ink/20 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20";

export function StockAlertForm({
  carId,
  initialBrand = "",
  initialModel = "",
  initialMaxPrice,
  className,
  compact = false,
  onSuccess
}: StockAlertFormProps) {
  const id = useId();
  const [channel, setChannel] = useState<AlertChannel>("EMAIL");
  const [alertType, setAlertType] = useState<AlertType>(carId ? "PRICE_DROP" : "BOTH");
  const [isPending, setIsPending] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

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
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name") || undefined,
          email: formData.get("email") || undefined,
          phone: formData.get("phone") || undefined,
          channel,
          type: alertType,
          carId,
          criteria: {
            brand: formData.get("brand") || undefined,
            model: formData.get("model") || undefined,
            maxPrice: formData.get("maxPrice") ? Number(formData.get("maxPrice")) : undefined,
            fuelType: formData.get("fuelType") || undefined
          },
          consent: formData.get("consent") === "on"
        })
      });

      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "Your stock alert could not be created."));
      }

      const result = (await response.json()) as {
        data?: { id?: string; verificationEmailSent?: boolean };
      };
      const alertId = result.data?.id ?? "";

      if (result.data?.verificationEmailSent) {
        setState("success");
        setMessage(
          "Check your inbox and confirm your email within 48 hours. Your alert stays paused until then."
        );
      } else {
        setState("error");
        setMessage(
          "Your request was saved, but we could not send the confirmation email. Please try again later or contact the showroom."
        );
      }
      onSuccess?.(alertId);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Your stock alert could not be created. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isPending}
      className={cn(
        "overflow-hidden border border-ink/15 bg-white",
        className
      )}
    >
      <div className={cn("border-b-8 border-racing bg-ink text-white", compact ? "p-5" : "p-5 sm:p-6")}>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/25 bg-racing text-white">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
              Never miss the right car
            </p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase leading-none tracking-[-0.02em]">
              {carId ? "Watch this vehicle" : "Create a showroom alert"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {carId
                ? "Get a direct update if its price or availability changes."
                : "Tell us what matters and get an update when matching stock arrives or drops in price."}
            </p>
          </div>
        </div>
      </div>

      <div className={compact ? "p-5" : "p-5 sm:p-6"}>
        <fieldset disabled={state === "success"}>
          <legend className="sr-only">Stock alert preferences</legend>

          <fieldset>
            <legend className="text-sm font-bold text-ink/75">Alert me about</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                ["BOTH", "Any match"],
                ["NEW_STOCK", "New stock"],
                ["PRICE_DROP", "Price drop"]
              ] as const).map(([value, label]) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="alertType"
                    value={value}
                    checked={alertType === value}
                    onChange={() => setAlertType(value)}
                    className="peer sr-only"
                  />
                  <span className="grid min-h-11 place-items-center border border-ink/20 bg-smoke px-2 text-center text-xs font-black uppercase tracking-[0.04em] text-ink/60 transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-racing peer-focus-visible:ring-offset-2">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {!carId ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label htmlFor={`${id}-brand`}>
                <span className="text-sm font-bold text-ink/75">Preferred brand</span>
                <input id={`${id}-brand`} name="brand" maxLength={60} defaultValue={initialBrand} placeholder="Any brand" className={fieldClass} />
              </label>
              <label htmlFor={`${id}-model`}>
                <span className="text-sm font-bold text-ink/75">Model</span>
                <input id={`${id}-model`} name="model" maxLength={80} defaultValue={initialModel} placeholder="Any model" className={fieldClass} />
              </label>
              <label htmlFor={`${id}-budget`}>
                <span className="text-sm font-bold text-ink/75">Maximum price (RM)</span>
                <input id={`${id}-budget`} name="maxPrice" type="number" inputMode="numeric" min={0} max={10_000_000} step={1000} defaultValue={initialMaxPrice} placeholder="No maximum" className={fieldClass} />
              </label>
              <label htmlFor={`${id}-fuel`}>
                <span className="text-sm font-bold text-ink/75">Fuel type</span>
                <select id={`${id}-fuel`} name="fuelType" defaultValue="" className={fieldClass}>
                  <option value="">Any fuel type</option>
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ELECTRIC">Electric</option>
                </select>
              </label>
            </div>
          ) : null}

          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-ink/75">Preferred contact method</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                ["EMAIL", "Email", Mail],
                ["WHATSAPP", "WhatsApp", MessageCircle],
                ["SMS", "SMS", MessageCircle]
              ] as const).map(([value, label, Icon]) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="channel"
                    value={value}
                    checked={channel === value}
                    onChange={() => setChannel(value)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-11 items-center justify-center gap-1.5 border border-ink/20 bg-smoke px-2 text-xs font-black uppercase tracking-[0.04em] text-ink/60 transition peer-checked:border-racing peer-checked:bg-racing peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-racing peer-focus-visible:ring-offset-2">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label htmlFor={`${id}-name`}>
              <span className="text-sm font-bold text-ink/75">
                Your name <span className="font-normal text-ink/40">(optional)</span>
              </span>
              <input id={`${id}-name`} name="name" minLength={2} maxLength={100} autoComplete="name" className={fieldClass} />
            </label>
            <label htmlFor={`${id}-email`}>
              <span className="text-sm font-bold text-ink/75">Email</span>
              <input id={`${id}-email`} name="email" type="email" required maxLength={160} autoComplete="email" inputMode="email" className={fieldClass} />
            </label>
            {channel !== "EMAIL" ? (
              <label htmlFor={`${id}-phone`} className="sm:col-span-2">
                <span className="text-sm font-bold text-ink/75">Mobile number</span>
                <input id={`${id}-phone`} name="phone" type="tel" required maxLength={40} autoComplete="tel" inputMode="tel" placeholder="Include country code, e.g. +60" className={fieldClass} />
              </label>
            ) : null}
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 border-l-4 border-ink bg-smoke p-4">
            <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 border-ink/20 accent-racing" />
            <span className="text-xs leading-5 text-ink/60">
              I agree to receive a verification email and the selected vehicle alerts after I
              confirm my address. I can stop them at any time.
            </span>
          </label>
        </fieldset>

        {message ? (
          <div
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
            className={cn(
              "mt-4 flex items-start gap-2 border-l-4 px-4 py-3 text-sm font-semibold leading-6",
              state === "success" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-700 bg-red-50 text-red-700"
            )}
          >
            {state === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            <span>{message}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || state === "success"}
          className={cn(
            "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.08em] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
            state === "success"
              ? "bg-amber-600 focus-visible:ring-amber-500/30"
              : "bg-racing hover:bg-copper focus-visible:ring-racing/30"
          )}
        >
          {state === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {isPending
            ? "Creating alert..."
            : state === "success"
              ? "Awaiting email confirmation"
              : "Create my alert"}
        </button>

        <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-ink/45">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Email confirmation is required for every contact method. Your details are never sold.
        </p>
      </div>
    </form>
  );
}

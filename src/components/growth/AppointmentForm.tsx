"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Send,
  ShieldCheck
} from "lucide-react";
import { apiErrorMessage } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

export type AppointmentVehicle = {
  id: string;
  name: string;
  status?: string;
};

export type AppointmentFormProps = {
  vehicles?: AppointmentVehicle[];
  initialCarId?: string;
  initialIntent?: "viewing" | "finance";
  className?: string;
  onSuccess?: (appointmentId: string) => void;
};

type AppointmentSlot = {
  time: string;
  available: boolean;
};

type FormState = "idle" | "success" | "error";

const fieldClass =
  "mt-2 h-12 w-full border border-ink/20 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20 disabled:cursor-not-allowed disabled:bg-smoke disabled:opacity-55";

function malaysiaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function timeLabel(time: string) {
  const [hourValue, minute = "00"] = time.split(":");
  const hour = Number(hourValue);

  if (!Number.isFinite(hour)) {
    return time;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

export function AppointmentForm({
  vehicles = [],
  initialCarId = "",
  initialIntent = "viewing",
  className,
  onSuccess
}: AppointmentFormProps) {
  const id = useId();
  const [date, setDate] = useState("");
  const [carId, setCarId] = useState(initialCarId);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotMessage, setSlotMessage] = useState("Choose a date to see showroom times.");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!date) {
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({ date });

    if (carId) {
      query.set("carId", carId);
    }

    void fetch(`/api/appointments?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await apiErrorMessage(response, "Times could not be loaded."));
        }

        return (await response.json()) as { data?: { slots?: AppointmentSlot[] } };
      })
      .then((result) => {
        const availableSlots = (result.data?.slots ?? []).filter((slot) => slot.available);
        setSlots(availableSlots);
        setSlotMessage(
          availableSlots.length > 0
            ? `${availableSlots.length} ${availableSlots.length === 1 ? "time is" : "times are"} available.`
            : "No online times remain for this date. Please choose another day."
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSlotMessage(error instanceof Error ? error.message : "Times could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingSlots(false);
        }
      });

    return () => controller.abort();
  }, [carId, date]);

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
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          date,
          time,
          carId: carId || undefined,
          notes: formData.get("notes") || undefined,
          consent: formData.get("consent") === "on"
        })
      });

      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "Your appointment request could not be sent."));
      }

      const result = (await response.json()) as { data?: { id?: string } };
      const appointmentId = result.data?.id ?? "";

      setState("success");
      setMessage("Your preferred time is requested. The showroom will contact you to confirm it.");
      onSuccess?.(appointmentId);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Your request could not be sent. Please try another time."
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
      <div className="border-b-8 border-racing bg-ink p-5 text-white sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center border border-white/25 bg-racing text-white">
            <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
              Personal showroom visit
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase leading-none tracking-[-0.02em]">
              {initialIntent === "finance" ? "Meet a vehicle and finance specialist" : "Book a test drive"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Choose a live showroom time. We will confirm the vehicle and have it prepared before
              you arrive.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <fieldset disabled={state === "success"}>
          <legend className="sr-only">Test drive request details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label htmlFor={`${id}-vehicle`} className="sm:col-span-2">
              <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
                <CarFront className="h-4 w-4 text-racing" aria-hidden="true" />
                Vehicle
              </span>
              <select
                id={`${id}-vehicle`}
                name="carId"
                value={carId}
                onChange={(event) => {
                  setCarId(event.target.value);
                  setSlots([]);
                  setTime("");
                  setIsLoadingSlots(Boolean(date));
                  setSlotMessage(date ? "Checking live availability..." : "Choose a date to see showroom times.");
                }}
                className={fieldClass}
              >
                <option value="">I would like help choosing a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}{vehicle.status === "RESERVED" ? " (reserved)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor={`${id}-date`}>
              <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
                <CalendarDays className="h-4 w-4 text-racing" aria-hidden="true" />
                Preferred date
              </span>
              <input
                id={`${id}-date`}
                name="date"
                type="date"
                required
                min={malaysiaToday()}
                value={date}
                onChange={(event) => {
                  const nextDate = event.target.value;
                  setDate(nextDate);
                  setSlots([]);
                  setTime("");
                  setIsLoadingSlots(Boolean(nextDate));
                  setSlotMessage(nextDate ? "Checking live availability..." : "Choose a date to see showroom times.");
                }}
                className={fieldClass}
              />
            </label>

            <label htmlFor={`${id}-time`}>
              <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
                <Clock3 className="h-4 w-4 text-racing" aria-hidden="true" />
                Preferred time
              </span>
              <select
                id={`${id}-time`}
                name="time"
                required
                disabled={!date || isLoadingSlots || slots.length === 0}
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={fieldClass}
                aria-describedby={`${id}-slot-message`}
              >
                <option value="">{isLoadingSlots ? "Checking times..." : "Select a time"}</option>
                {slots.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {timeLabel(slot.time)}
                  </option>
                ))}
              </select>
              <span id={`${id}-slot-message`} className="mt-1.5 block text-xs leading-5 text-ink/45" aria-live="polite">
                {slotMessage}
              </span>
            </label>

            <label htmlFor={`${id}-name`}>
              <span className="text-sm font-bold text-ink/75">Your name</span>
              <input
                id={`${id}-name`}
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                className={fieldClass}
              />
            </label>

            <label htmlFor={`${id}-phone`}>
              <span className="text-sm font-bold text-ink/75">Phone</span>
              <input
                id={`${id}-phone`}
                name="phone"
                type="tel"
                required
                maxLength={40}
                autoComplete="tel"
                inputMode="tel"
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
                className={fieldClass}
              />
            </label>

            <label htmlFor={`${id}-notes`} className="sm:col-span-2">
              <span className="text-sm font-bold text-ink/75">
                Anything we should prepare? <span className="font-normal text-ink/40">(optional)</span>
              </span>
              <textarea
                id={`${id}-notes`}
                name="notes"
                rows={4}
                maxLength={1000}
                defaultValue={
                  initialIntent === "finance"
                    ? "I would also like to discuss financing options during my visit."
                    : undefined
                }
                placeholder="For example: a trade-in, child seat space, or finance questions."
                className="mt-2 w-full resize-y border border-ink/20 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20"
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
              I agree that Prestige Motors may contact me to arrange and confirm this appointment.
            </span>
          </label>
        </fieldset>

        {message ? (
          <div
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
            className={cn(
              "mt-5 flex items-start gap-2 border-l-4 px-4 py-3 text-sm font-semibold leading-6",
              state === "success" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-700 bg-red-50 text-red-700"
            )}
          >
            {state === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : null}
            <span>{message}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || state === "success" || !date || !time}
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
          {isPending ? "Requesting time..." : state === "success" ? "Appointment requested" : "Request this test drive"}
        </button>

        <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-ink/45">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          A request is not final until the showroom confirms the vehicle and time with you.
        </p>
      </div>
    </form>
  );
}

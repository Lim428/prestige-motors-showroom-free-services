"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save
} from "lucide-react";
import { adminFetch } from "@/components/admin/adminFetch";
import { cn } from "@/lib/utils";

type AppointmentStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

type AppointmentType = "TEST_DRIVE" | "SHOWROOM_VISIT" | "VIDEO_CALL";

type AppointmentItem = {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  name: string;
  email: string;
  phone: string | null;
  notes: string;
  startAt: string;
  endAt: string | null;
  timezone: string;
  createdAt: string | null;
  car: {
    id: string;
    slug: string | null;
    label: string;
  } | null;
  leadId: string | null;
};

const appointmentStatuses: AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW"
];

const appointmentTypes: AppointmentType[] = [
  "TEST_DRIVE",
  "SHOWROOM_VISIT",
  "VIDEO_CALL"
];

const controlClassName =
  "h-11 border border-ink/20 bg-white px-3 text-sm text-ink outline-none transition hover:border-ink/35 focus:border-signal focus:ring-2 focus:ring-signal/15 disabled:cursor-not-allowed disabled:opacity-50";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  const text = asText(value).trim();
  return text || null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAppointment(value: unknown): AppointmentItem | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") {
    return null;
  }

  const car = asRecord(record.car);
  const lead = asRecord(record.lead);
  const status = appointmentStatuses.includes(record.status as AppointmentStatus)
    ? (record.status as AppointmentStatus)
    : "REQUESTED";
  const type = appointmentTypes.includes(record.type as AppointmentType)
    ? (record.type as AppointmentType)
    : "SHOWROOM_VISIT";
  const startAt = asText(record.startAt);
  if (!startAt) {
    return null;
  }

  const carParts = car
    ? [car.year, car.brand, car.model].filter(
        (part) => typeof part === "string" || typeof part === "number"
      )
    : [];

  return {
    id: record.id,
    type,
    status,
    name: asText(record.name) || asText(record.email) || "Unnamed visitor",
    email: asText(record.email),
    phone: nullableText(record.phone),
    notes: asText(record.notes),
    startAt,
    endAt: nullableText(record.endAt),
    timezone: asText(record.timezone, "Asia/Kuala_Lumpur"),
    createdAt: nullableText(record.createdAt),
    car:
      car && typeof car.id === "string"
        ? {
            id: car.id,
            slug: nullableText(car.slug),
            label: carParts.length > 0 ? carParts.join(" ") : "Selected vehicle"
          }
        : null,
    leadId: lead && typeof lead.id === "string" ? lead.id : null
  };
}

function normalizeItems(payload: unknown) {
  const values = Array.isArray(payload)
    ? payload
    : (() => {
        const record = asRecord(payload);
        return record && Array.isArray(record.items) ? record.items : [];
      })();

  return values.flatMap((value) => {
    const appointment = normalizeAppointment(value);
    return appointment ? [appointment] : [];
  });
}

function dateParts(startAt: string, timeZone: string) {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "" };
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`
  };
}

function formatSchedule(appointment: AppointmentItem) {
  const date = new Date(appointment.startAt);
  if (Number.isNaN(date.getTime())) {
    return "Schedule unavailable";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: appointment.timezone
  }).format(date);
}

function statusClassName(status: AppointmentStatus) {
  if (status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "CONFIRMED") {
    return "bg-blue-100 text-blue-800";
  }
  if (status === "CANCELLED" || status === "NO_SHOW") {
    return "bg-zinc-200 text-zinc-700";
  }
  return "bg-amber-100 text-amber-900";
}

export function AppointmentManager() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AppointmentStatus>(
    "ALL"
  );
  const [dateFilter, setDateFilter] = useState<"UPCOMING" | "TODAY" | "PAST" | "ALL">(
    "UPCOMING"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<string, { date: string; time: string; notes: string }>
  >({});
  const [liveMessage, setLiveMessage] = useState("");
  const requestId = useRef(0);

  const loadAppointments = useCallback(async (quiet = false) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    if (!quiet) {
      setIsLoading(true);
    }
    setLoadError("");
    try {
      const query = new URLSearchParams({
        limit: "100",
        range: dateFilter
      });
      if (statusFilter !== "ALL") {
        query.set("status", statusFilter);
      }
      const payload = await adminFetch<unknown>(
        `/api/admin/appointments?${query.toString()}`,
        { method: "GET" },
        "Appointments could not be loaded."
      );
      if (requestId.current !== currentRequest) {
        return;
      }
      const record = asRecord(payload);
      const normalizedItems = normalizeItems(payload);
      setAppointments(normalizedItems);
      setTotalAppointments(
        record && typeof record.total === "number"
          ? record.total
          : normalizedItems.length
      );
    } catch (error) {
      if (requestId.current !== currentRequest) {
        return;
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : "Appointments could not be loaded."
      );
    } finally {
      if (requestId.current === currentRequest && !quiet) {
        setIsLoading(false);
      }
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    return [...appointments]
      .sort((left, right) => {
        const leftTime = new Date(left.startAt).getTime();
        const rightTime = new Date(right.startAt).getTime();
        return dateFilter === "UPCOMING" || dateFilter === "TODAY"
          ? leftTime - rightTime
          : rightTime - leftTime;
      });
  }, [appointments, dateFilter]);

  function setPending(id: string, pending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleDetails(appointment: AppointmentItem) {
    setDrafts((current) => ({
      ...current,
      [appointment.id]: current[appointment.id] ?? {
        ...dateParts(appointment.startAt, appointment.timezone),
        notes: appointment.notes
      }
    }));
    setExpandedId((current) =>
      current === appointment.id ? null : appointment.id
    );
  }

  async function patchAppointment(
    appointment: AppointmentItem,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    if (pendingIds.has(appointment.id)) {
      return false;
    }

    setPending(appointment.id, true);
    setErrors((current) => ({ ...current, [appointment.id]: "" }));
    setLiveMessage("");
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/appointments/${appointment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        },
        "Appointment could not be updated."
      );
      const updated = normalizeAppointment(payload);
      if (updated) {
        setAppointments((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
      }
      await loadAppointments(true);
      setLiveMessage(successMessage);
      return true;
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [appointment.id]:
          error instanceof Error
            ? error.message
            : "Appointment could not be updated."
      }));
      return false;
    } finally {
      setPending(appointment.id, false);
    }
  }

  async function updateStatus(
    appointment: AppointmentItem,
    status: AppointmentStatus
  ) {
    if (status === appointment.status) {
      return;
    }
    await patchAppointment(
      appointment,
      { status },
      `${appointment.name}'s appointment is now ${titleCase(status)}.`
    );
  }

  async function saveDetails(appointment: AppointmentItem) {
    const draft = drafts[appointment.id];
    if (!draft) {
      return;
    }
    await patchAppointment(
      appointment,
      {
        date: draft.date,
        time: draft.time,
        notes: draft.notes.trim() || null
      },
      `${appointment.name}'s schedule was saved.`
    );
  }

  if (isLoading) {
    return <AppointmentLoading />;
  }

  if (loadError) {
    return <AppointmentError message={loadError} onRetry={loadAppointments} />;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b-2 border-ink pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-signal">Calendar</p>
          <h3 className="mt-1 font-display text-2xl font-black uppercase leading-none tracking-wide text-ink">Appointments</h3>
          <p className="mt-1 text-sm text-ink/65">
            {filteredAppointments.length} of {totalAppointments} matching bookings shown
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label>
            <span className="sr-only">Filter appointments by date</span>
            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as typeof dateFilter)
              }
              className={`${controlClassName} w-full sm:w-36`}
            >
              <option value="UPCOMING">Upcoming</option>
              <option value="TODAY">Today</option>
              <option value="PAST">Past</option>
              <option value="ALL">All dates</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter appointments by status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | AppointmentStatus)
              }
              className={`${controlClassName} w-full sm:w-40`}
            >
              <option value="ALL">All statuses</option>
              {appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadAppointments(false)}
            className="inline-flex h-11 items-center justify-center gap-2 border border-ink/20 px-3 text-sm font-bold text-ink outline-none hover:border-ink hover:bg-smoke focus:ring-2 focus:ring-signal/20"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      <div className="mt-4 grid gap-3">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => {
            const isPending = pendingIds.has(appointment.id);
            const isExpanded = expandedId === appointment.id;
            const draft = drafts[appointment.id];

            return (
              <article
                key={appointment.id}
                aria-busy={isPending}
                className="border border-l-[3px] border-ink/15 border-l-signal bg-white p-4 transition hover:border-ink/35"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-lg font-black uppercase leading-none tracking-wide text-ink">{appointment.name}</h4>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
                          statusClassName(appointment.status)
                        )}
                      >
                        {titleCase(appointment.status)}
                      </span>
                      <span className="rounded-full bg-smoke px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-ink/65">
                        {titleCase(appointment.type)}
                      </span>
                    </div>

                    <p className="mt-3 inline-flex items-start gap-2 text-sm font-black text-ink">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                      {formatSchedule(appointment)}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-ink/55">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Timezone: {appointment.timezone}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/70">
                      {appointment.email ? (
                        <a
                          href={`mailto:${appointment.email}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded outline-none hover:underline focus:ring-2 focus:ring-ink/20"
                        >
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          {appointment.email}
                        </a>
                      ) : null}
                      {appointment.phone ? (
                        <a
                          href={`tel:${appointment.phone}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded outline-none hover:underline focus:ring-2 focus:ring-ink/20"
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          {appointment.phone}
                        </a>
                      ) : null}
                      {appointment.car ? (
                        appointment.car.slug ? (
                          <Link
                            href={`/cars/${appointment.car.slug}`}
                            className="inline-flex min-h-9 items-center gap-1.5 font-bold text-signal outline-none hover:underline focus:ring-2 focus:ring-signal/20"
                          >
                            {appointment.car.label}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-9 items-center font-bold">
                            {appointment.car.label}
                          </span>
                        )
                      ) : null}
                    </div>

                    {appointment.notes ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/65">
                        {appointment.notes}
                      </p>
                    ) : null}
                    {errors[appointment.id] ? (
                      <p role="alert" className="mt-3 text-sm font-bold text-red-700">
                        {errors[appointment.id]}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <span className="inline-flex items-center gap-2 px-2 text-xs font-bold text-ink/55">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Saving
                      </span>
                    ) : null}
                    <label>
                      <span className="sr-only">Status for {appointment.name}</span>
                      <select
                        value={appointment.status}
                        disabled={isPending}
                        onChange={(event) =>
                          void updateStatus(
                            appointment,
                            event.target.value as AppointmentStatus
                          )
                        }
                        className={`${controlClassName} min-w-36`}
                      >
                        {appointmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleDetails(appointment)}
                      aria-expanded={isExpanded}
                      aria-controls={`appointment-${appointment.id}-details`}
                      className="h-11 border border-ink/20 px-3 text-sm font-bold text-ink outline-none hover:border-ink hover:bg-smoke focus:ring-2 focus:ring-signal/20"
                    >
                      {isExpanded ? "Close details" : "Reschedule"}
                    </button>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <div
                    id={`appointment-${appointment.id}-details`}
                    className="mt-4 grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-2"
                  >
                    <label className="grid gap-1.5 text-sm font-bold text-ink">
                      Appointment date
                      <input
                        type="date"
                        value={draft.date}
                        disabled={isPending}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...draft, date: event.target.value }
                          }))
                        }
                        className={controlClassName}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold text-ink">
                      Start time
                      <input
                        type="time"
                        value={draft.time}
                        disabled={isPending}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...draft, time: event.target.value }
                          }))
                        }
                        className={controlClassName}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold text-ink sm:col-span-2">
                      Internal appointment notes
                      <textarea
                        value={draft.notes}
                        disabled={isPending}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...draft, notes: event.target.value }
                          }))
                        }
                        rows={3}
                        placeholder="Preparation, customer requests or visit outcome"
                        className="border border-ink/20 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none hover:border-ink/35 focus:border-signal focus:ring-2 focus:ring-signal/15"
                      />
                    </label>
                    <div className="flex justify-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => void saveDetails(appointment)}
                        disabled={isPending || !draft.date || !draft.time}
                        className="inline-flex h-11 items-center gap-2 bg-ink px-4 text-sm font-black uppercase tracking-wide text-white outline-none hover:bg-signal focus:ring-2 focus:ring-signal/30 focus:ring-offset-2 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Save schedule
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="grid min-h-64 place-items-center border border-dashed border-ink/25 bg-smoke/25 px-5 text-center">
            <div>
              <CalendarClock className="mx-auto h-8 w-8 text-ink/30" aria-hidden="true" />
              <h4 className="mt-3 font-display text-lg font-black uppercase tracking-wide text-ink">No appointments here</h4>
              <p className="mt-1 text-sm text-ink/60">
                Adjust the filters or wait for the next customer booking.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDateFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="mt-4 h-11 border border-ink/20 bg-white px-4 text-sm font-bold text-ink outline-none hover:border-ink hover:bg-smoke focus:ring-2 focus:ring-signal/20"
              >
                Show all appointments
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentLoading() {
  return (
    <div role="status" className="grid min-h-72 place-items-center border border-dashed border-ink/20 bg-smoke/35 text-center">
      <div>
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-signal" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-ink/65">Loading appointments</p>
      </div>
    </div>
  );
}

function AppointmentError({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="grid min-h-72 place-items-center border border-red-200 border-l-4 border-l-red-600 bg-red-50/50 px-5 text-center">
      <div>
        <Clock3 className="mx-auto h-8 w-8 text-red-600" aria-hidden="true" />
        <h3 className="mt-3 font-display text-lg font-black uppercase tracking-wide text-red-900">Appointments unavailable</h3>
        <p className="mt-1 text-sm text-red-800">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-11 items-center gap-2 border border-red-300 bg-white px-4 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-300"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}

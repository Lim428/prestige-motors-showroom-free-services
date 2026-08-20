"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CarFront,
  CalendarClock,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { adminFetch } from "@/components/admin/adminFetch";
import type { GrowthAdminIdentity } from "@/components/admin/growth/AdminGrowthHub";
import { cn } from "@/lib/utils";

type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "APPOINTMENT_SET"
  | "NEGOTIATING"
  | "WON"
  | "LOST"
  | "ARCHIVED";

type LeadNote = {
  id: string;
  content: string;
  createdAt: string | null;
  authorName: string | null;
};

type LeadTranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

type PreferredVehicle = {
  id: string;
  slug: string | null;
  label: string;
  status: string | null;
  missing: boolean;
};

type LeadItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: LeadStatus;
  summary: string;
  nextFollowUpAt: string | null;
  createdAt: string | null;
  car: {
    id: string;
    slug: string | null;
    label: string;
  } | null;
  preferredVehicles: PreferredVehicle[];
  transcript: LeadTranscriptMessage[];
  assignedTo: {
    id: string;
    name: string;
  } | null;
  notes: LeadNote[];
};

const leadStatuses: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "APPOINTMENT_SET",
  "NEGOTIATING",
  "WON",
  "LOST",
  "ARCHIVED"
];

const controlClassName =
  "h-11 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNullableText(value: unknown) {
  const text = asText(value).trim();
  return text ? text : null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not scheduled"
    : new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
}

function toDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function normalizeLead(value: unknown): LeadItem | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") {
    return null;
  }

  const car = asRecord(record.car);
  const assignedTo = asRecord(record.assignedTo);
  const rawNotes = Array.isArray(record.notes) ? record.notes : [];
  const rawPreferredVehicles = Array.isArray(record.preferredVehicles)
    ? record.preferredVehicles
    : [];
  const rawTranscript = Array.isArray(record.transcript) ? record.transcript : [];
  const status = leadStatuses.includes(record.status as LeadStatus)
    ? (record.status as LeadStatus)
    : "NEW";
  const carParts = car
    ? [car.year, car.brand, car.model].filter(
        (part) => typeof part === "string" || typeof part === "number"
      )
    : [];
  const preferredVehicles = rawPreferredVehicles.flatMap((vehicle) => {
    const vehicleRecord = asRecord(vehicle);
    if (!vehicleRecord || typeof vehicleRecord.id !== "string") {
      return [];
    }

    const missing = vehicleRecord.missing === true;
    const parts = [vehicleRecord.year, vehicleRecord.brand, vehicleRecord.model].filter(
      (part) => typeof part === "string" || typeof part === "number"
    );
    return [
      {
        id: vehicleRecord.id,
        slug: asNullableText(vehicleRecord.slug),
        label:
          parts.length > 0
            ? parts.join(" ")
            : missing
              ? "Vehicle no longer in inventory"
              : "Selected vehicle",
        status: asNullableText(vehicleRecord.status),
        missing
      }
    ];
  });

  if (preferredVehicles.length === 0 && car && typeof car.id === "string") {
    preferredVehicles.push({
      id: car.id,
      slug: asNullableText(car.slug),
      label: carParts.length > 0 ? carParts.join(" ") : "Selected vehicle",
      status: null,
      missing: false
    });
  }

  return {
    id: record.id,
    name:
      asText(record.name) ||
      asText(record.customerName) ||
      asText(record.email) ||
      "Unnamed lead",
    email: asNullableText(record.email),
    phone: asNullableText(record.phone),
    source: asText(record.source, "WEBSITE"),
    status,
    summary: asText(record.summary),
    nextFollowUpAt: asNullableText(record.nextFollowUpAt),
    createdAt: asNullableText(record.createdAt),
    car:
      car && typeof car.id === "string"
        ? {
            id: car.id,
            slug: asNullableText(car.slug),
            label: carParts.length > 0 ? carParts.join(" ") : "Selected vehicle"
          }
        : null,
    preferredVehicles,
    transcript: rawTranscript.flatMap((message) => {
      const messageRecord = asRecord(message);
      if (!messageRecord) {
        return [];
      }

      const role = messageRecord.role;
      const content = asText(messageRecord.content).trim().slice(0, 1200);
      return (role === "user" || role === "assistant") && content
        ? [{ role, content }]
        : [];
    }),
    assignedTo:
      assignedTo && typeof assignedTo.id === "string"
        ? {
            id: assignedTo.id,
            name:
              asText(assignedTo.name) ||
              asText(assignedTo.email) ||
              "Assigned admin"
          }
        : null,
    notes: rawNotes.flatMap((note, index) => {
      const noteRecord = asRecord(note);
      if (!noteRecord) {
        return [];
      }

      const author = asRecord(noteRecord.author);
      const content = asText(noteRecord.content) || asText(noteRecord.note);
      if (!content) {
        return [];
      }

      return [
        {
          id: asText(noteRecord.id, `${record.id}-note-${index}`),
          content,
          createdAt: asNullableText(noteRecord.createdAt),
          authorName: author
            ? asNullableText(author.name) ?? asNullableText(author.email)
            : null
        }
      ];
    })
  };
}

function leadItems(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      const lead = normalizeLead(item);
      return lead ? [lead] : [];
    });
  }

  const record = asRecord(payload);
  const items = record && Array.isArray(record.items) ? record.items : [];
  return items.flatMap((item) => {
    const lead = normalizeLead(item);
    return lead ? [lead] : [];
  });
}

function statusClassName(status: LeadStatus) {
  if (status === "WON") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "LOST" || status === "ARCHIVED") {
    return "bg-zinc-200 text-zinc-700";
  }
  if (status === "NEGOTIATING" || status === "APPOINTMENT_SET") {
    return "bg-amber-100 text-amber-900";
  }
  if (status === "QUALIFIED") {
    return "bg-blue-100 text-blue-800";
  }
  if (status === "CONTACTED") {
    return "bg-violet-100 text-violet-800";
  }
  return "bg-copper/10 text-copper";
}

export function LeadPipeline({
  currentAdmin
}: {
  currentAdmin?: GrowthAdminIdentity;
}) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<"ALL" | LeadStatus>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<string, { summary: string; note: string; followUpAt: string; assignedToId: string }>
  >({});
  const [liveMessage, setLiveMessage] = useState("");

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const payload = await adminFetch<unknown>(
        "/api/admin/leads?limit=100",
        { method: "GET" },
        "Leads could not be loaded."
      );
      setLeads(leadItems(payload));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Leads could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const assignees = useMemo(() => {
    const unique = new Map<string, string>();
    if (currentAdmin) {
      unique.set(currentAdmin.id, currentAdmin.name);
    }
    for (const lead of leads) {
      if (lead.assignedTo) {
        unique.set(lead.assignedTo.id, lead.assignedTo.name);
      }
    }
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [currentAdmin, leads]);

  const filteredLeads = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "ALL" && lead.status !== statusFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }

      return [
        lead.name,
        lead.email ?? "",
        lead.phone ?? "",
        lead.source,
        lead.summary,
        lead.car?.label ?? "",
        ...lead.preferredVehicles.map((vehicle) => vehicle.label)
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [deferredQuery, leads, statusFilter]);

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

  function openLead(lead: LeadItem) {
    setDrafts((current) => ({
      ...current,
      [lead.id]: current[lead.id] ?? {
        summary: lead.summary,
        note: "",
        followUpAt: toDateTimeInput(lead.nextFollowUpAt),
        assignedToId: lead.assignedTo?.id ?? ""
      }
    }));
    setExpandedId((current) => (current === lead.id ? null : lead.id));
  }

  async function patchLead(
    lead: LeadItem,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    if (pendingIds.has(lead.id)) {
      return false;
    }

    setPending(lead.id, true);
    setItemErrors((current) => ({ ...current, [lead.id]: "" }));
    setLiveMessage("");

    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/leads/${lead.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        },
        "Lead could not be updated."
      );
      const updated = normalizeLead(payload);
      if (updated) {
        setLeads((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        await loadLeads();
      }
      setLiveMessage(successMessage);
      return true;
    } catch (error) {
      setItemErrors((current) => ({
        ...current,
        [lead.id]:
          error instanceof Error ? error.message : "Lead could not be updated."
      }));
      return false;
    } finally {
      setPending(lead.id, false);
    }
  }

  async function updateStatus(lead: LeadItem, status: LeadStatus) {
    if (status === lead.status) {
      return;
    }

    await patchLead(lead, { status }, `${lead.name} moved to ${titleCase(status)}.`);
  }

  async function saveFollowUp(lead: LeadItem) {
    const draft = drafts[lead.id];
    if (!draft) {
      return;
    }

    const body: Record<string, unknown> = {
      summary: draft.summary.trim() || null,
      assignedToId: draft.assignedToId || null,
      nextFollowUpAt: draft.followUpAt
        ? new Date(draft.followUpAt).toISOString()
        : null
    };
    if (draft.note.trim()) {
      body.note = draft.note.trim();
    }

    const saved = await patchLead(
      lead,
      body,
      `${lead.name}'s follow-up details were saved.`
    );
    if (saved) {
      setDrafts((current) => ({
        ...current,
        [lead.id]: { ...draft, note: "" }
      }));
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading lead pipeline" />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadLeads} />;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h3 className="text-xl font-black text-ink">Lead pipeline</h3>
          <p className="mt-1 text-sm text-ink/65">
            {filteredLeads.length} of {leads.length} leads shown
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative sm:w-64">
            <span className="sr-only">Search leads</span>
            <Search
              className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/45"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search leads..."
              className={`${controlClassName} w-full pl-9`}
            />
          </label>
          <label>
            <span className="sr-only">Filter leads by status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | LeadStatus)
              }
              className={`${controlClassName} w-full sm:w-44`}
            >
              <option value="ALL">All stages</option>
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadLeads()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
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
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const isPending = pendingIds.has(lead.id);
            const draft = drafts[lead.id];

            return (
              <article
                key={lead.id}
                aria-busy={isPending}
                className="rounded-md border border-ink/10 bg-white p-4 transition hover:border-ink/25"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-ink">{lead.name}</h4>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
                          statusClassName(lead.status)
                        )}
                      >
                        {titleCase(lead.status)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-ink/45">
                        {titleCase(lead.source)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/70">
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded outline-none hover:text-ink hover:underline focus:ring-2 focus:ring-ink/20"
                        >
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          {lead.email}
                        </a>
                      ) : null}
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded outline-none hover:text-ink hover:underline focus:ring-2 focus:ring-ink/20"
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          {lead.phone}
                        </a>
                      ) : null}
                      {lead.car ? (
                        lead.car.slug ? (
                          <Link
                            href={`/cars/${lead.car.slug}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded font-bold text-copper outline-none hover:underline focus:ring-2 focus:ring-ink/20"
                          >
                            {lead.car.label}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-9 items-center font-bold text-ink/65">
                            {lead.car.label}
                          </span>
                        )
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink/60">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
                        {lead.assignedTo?.name ?? "Unassigned"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        Follow-up: {formatDateTime(lead.nextFollowUpAt)}
                      </span>
                    </div>

                    {lead.summary ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70">
                        {lead.summary}
                      </p>
                    ) : null}
                    {lead.preferredVehicles.length > 1 ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-ink/55">
                        <CarFront className="h-4 w-4" aria-hidden="true" />
                        {lead.preferredVehicles.length} vehicles mentioned
                      </p>
                    ) : null}
                    {itemErrors[lead.id] ? (
                      <p role="alert" className="mt-3 text-sm font-bold text-red-700">
                        {itemErrors[lead.id]}
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
                      <span className="sr-only">Pipeline stage for {lead.name}</span>
                      <select
                        value={lead.status}
                        disabled={isPending}
                        onChange={(event) =>
                          void updateStatus(lead, event.target.value as LeadStatus)
                        }
                        className={`${controlClassName} min-w-40`}
                      >
                        {leadStatuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => openLead(lead)}
                      aria-expanded={isExpanded}
                      aria-controls={`lead-${lead.id}-details`}
                      className="h-11 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
                    >
                      {isExpanded ? "Close details" : "Manage"}
                    </button>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <div
                    id={`lead-${lead.id}-details`}
                    className="mt-4 border-t border-ink/10 pt-4"
                  >
                    <div className="mb-5 grid gap-4 xl:grid-cols-2">
                      <section
                        aria-labelledby={`lead-${lead.id}-vehicles-heading`}
                        className="rounded-md border border-ink/10 bg-smoke/30 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <CarFront className="h-4 w-4 text-copper" aria-hidden="true" />
                          <h5
                            id={`lead-${lead.id}-vehicles-heading`}
                            className="text-sm font-black text-ink"
                          >
                            Vehicle interests
                          </h5>
                        </div>
                        {lead.preferredVehicles.length > 0 ? (
                          <ul className="mt-3 grid gap-2">
                            {lead.preferredVehicles.map((vehicle) => (
                              <li
                                key={vehicle.id}
                                className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm"
                              >
                                {vehicle.slug && !vehicle.missing ? (
                                  <Link
                                    href={`/cars/${vehicle.slug}`}
                                    className="inline-flex min-h-9 items-center gap-1.5 font-bold text-copper outline-none hover:underline focus:ring-2 focus:ring-ink/20"
                                  >
                                    {vehicle.label}
                                    <ExternalLink
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  </Link>
                                ) : (
                                  <div>
                                    <p className="font-bold text-ink/70">
                                      {vehicle.label}
                                    </p>
                                    {vehicle.missing ? (
                                      <p className="mt-0.5 text-xs text-ink/50">
                                        Saved reference {vehicle.id.slice(0, 8)}; the listing may have been deleted.
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                                {vehicle.status ? (
                                  <span className="mt-1 block text-[11px] font-black uppercase tracking-wide text-ink/45">
                                    {titleCase(vehicle.status)}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-ink/55">
                            No vehicle was attached to this lead.
                          </p>
                        )}
                      </section>

                      <section
                        aria-labelledby={`lead-${lead.id}-transcript-heading`}
                        className="rounded-md border border-ink/10 bg-smoke/30 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-copper" aria-hidden="true" />
                          <h5
                            id={`lead-${lead.id}-transcript-heading`}
                            className="text-sm font-black text-ink"
                          >
                            Assistant conversation
                          </h5>
                        </div>
                        {lead.transcript.length > 0 ? (
                          <ol
                            tabIndex={0}
                            aria-label="Saved assistant conversation"
                            className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 outline-none focus:ring-2 focus:ring-ink/20"
                          >
                            {lead.transcript.map((message, index) => (
                              <li
                                key={`${message.role}-${index}`}
                                className={cn(
                                  "rounded-md border px-3 py-2",
                                  message.role === "user"
                                    ? "border-copper/20 bg-copper/5"
                                    : "border-ink/10 bg-white"
                                )}
                              >
                                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-ink/50">
                                  {message.role === "user" ? (
                                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  {message.role === "user" ? "Customer" : "Assistant"}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink/75">
                                  {message.content}
                                </p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-ink/55">
                            No assistant conversation is attached to this lead.
                          </p>
                        )}
                      </section>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-bold text-ink">
                        Assigned sales owner
                        <select
                          value={draft.assignedToId}
                          disabled={isPending}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: {
                                ...draft,
                                assignedToId: event.target.value
                              }
                            }))
                          }
                          className={controlClassName}
                        >
                          <option value="">Unassigned</option>
                          {assignees.map((assignee) => (
                            <option key={assignee.id} value={assignee.id}>
                              {assignee.name}
                            </option>
                          ))}
                        </select>
                        {assignees.length === 0 ? (
                          <span className="text-xs font-normal text-ink/50">
                            Owners appear here after their first assignment.
                          </span>
                        ) : null}
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-ink">
                        Next follow-up
                        <input
                          type="datetime-local"
                          value={draft.followUpAt}
                          disabled={isPending}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: { ...draft, followUpAt: event.target.value }
                            }))
                          }
                          className={controlClassName}
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-ink lg:col-span-2">
                        Lead summary
                        <textarea
                          value={draft.summary}
                          disabled={isPending}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: { ...draft, summary: event.target.value }
                            }))
                          }
                          rows={3}
                          placeholder="Budget, vehicle preference and next best action"
                          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/15"
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-ink lg:col-span-2">
                        Add follow-up note
                        <textarea
                          value={draft.note}
                          disabled={isPending}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [lead.id]: { ...draft, note: event.target.value }
                            }))
                          }
                          rows={2}
                          placeholder="Add a timestamped internal note"
                          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/15"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 text-xs text-ink/55">
                        {lead.notes.length > 0 ? (
                          <p className="line-clamp-2">
                            <span className="font-black text-ink/70">Latest note:</span>{" "}
                            {lead.notes[0].content}
                          </p>
                        ) : (
                          <p>No internal notes yet.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveFollowUp(lead)}
                        disabled={isPending}
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-white outline-none hover:bg-graphite focus:ring-2 focus:ring-ink/30 focus:ring-offset-2 disabled:opacity-50"
                      >
                        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                        Save follow-up
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <EmptyState
            title="No matching leads"
            message="New website and assistant leads will appear here for qualification."
            onClear={() => {
              setQuery("");
              setStatusFilter("ALL");
            }}
          />
        )}
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="grid min-h-72 place-items-center rounded-md border border-dashed border-ink/15 bg-smoke/35 text-center"
    >
      <div>
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-copper" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-ink/65">{label}</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="grid min-h-72 place-items-center rounded-md border border-red-200 bg-red-50/50 px-5 text-center"
    >
      <div>
        <h3 className="font-black text-red-900">Lead pipeline unavailable</h3>
        <p className="mt-1 text-sm text-red-800">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-300"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  onClear
}: {
  title: string;
  message: string;
  onClear: () => void;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ink/20 bg-smoke/25 px-5 text-center">
      <div>
        <UsersRound className="mx-auto h-8 w-8 text-ink/30" aria-hidden="true" />
        <h4 className="mt-3 font-black text-ink">{title}</h4>
        <p className="mt-1 max-w-md text-sm leading-6 text-ink/60">{message}</p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 h-11 rounded-md border border-ink/15 bg-white px-4 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

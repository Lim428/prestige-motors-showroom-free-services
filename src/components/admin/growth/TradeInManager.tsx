"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Banknote,
  CarFront,
  Gauge,
  ImageIcon,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Search
} from "lucide-react";
import { adminFetch } from "@/components/admin/adminFetch";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type TradeInStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "APPRAISED"
  | "ACCEPTED"
  | "DECLINED"
  | "ARCHIVED";

type TradeInImage = {
  id: string;
  url: string;
  altText: string;
};

type TradeInItem = {
  id: string;
  status: TradeInStatus;
  name: string;
  email: string;
  phone: string | null;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  registration: string | null;
  condition: string;
  expectedPrice: number | null;
  appraisalAmount: number | null;
  notes: string;
  adminNotes: string;
  createdAt: string | null;
  images: TradeInImage[];
  leadId: string | null;
};

const tradeInStatuses: TradeInStatus[] = [
  "SUBMITTED",
  "REVIEWING",
  "APPRAISED",
  "ACCEPTED",
  "DECLINED",
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

function nullableText(value: unknown) {
  const text = asText(value).trim();
  return text || null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Not provided";
  }
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatMileage(value: number | null) {
  if (value === null) {
    return "Mileage not provided";
  }
  return `${new Intl.NumberFormat("en-MY").format(value)} km`;
}

function normalizeTradeIn(value: unknown): TradeInItem | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") {
    return null;
  }

  const status = tradeInStatuses.includes(record.status as TradeInStatus)
    ? (record.status as TradeInStatus)
    : "SUBMITTED";
  const lead = asRecord(record.lead);
  const rawImages = Array.isArray(record.images) ? record.images : [];

  return {
    id: record.id,
    status,
    name: asText(record.name) || asText(record.email) || "Unnamed customer",
    email: asText(record.email),
    phone: nullableText(record.phone),
    make: asText(record.make, "Unknown make"),
    model: asText(record.model, "Unknown model"),
    year: asNumber(record.year),
    mileage: asNumber(record.mileage),
    registration: nullableText(record.registration),
    condition: asText(record.condition, "Not specified"),
    expectedPrice: asNumber(record.expectedPrice),
    appraisalAmount: asNumber(record.appraisalAmount),
    notes: asText(record.notes),
    adminNotes: asText(record.adminNotes),
    createdAt: nullableText(record.createdAt),
    images: rawImages.flatMap((image, index) => {
      const imageRecord = asRecord(image);
      const url = imageRecord ? asText(imageRecord.url) : "";
      if (!imageRecord || !url) {
        return [];
      }
      return [
        {
          id: asText(imageRecord.id, `${record.id}-image-${index}`),
          url,
          altText:
            asText(imageRecord.altText) ||
            `${asText(record.make)} ${asText(record.model)} trade-in photo ${index + 1}`
        }
      ];
    }),
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
    const item = normalizeTradeIn(value);
    return item ? [item] : [];
  });
}

function statusClassName(status: TradeInStatus) {
  if (status === "ACCEPTED") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "DECLINED" || status === "ARCHIVED") {
    return "bg-zinc-200 text-zinc-700";
  }
  if (status === "APPRAISED") {
    return "bg-blue-100 text-blue-800";
  }
  if (status === "REVIEWING") {
    return "bg-violet-100 text-violet-800";
  }
  return "bg-amber-100 text-amber-900";
}

export function TradeInManager() {
  const [tradeIns, setTradeIns] = useState<TradeInItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TradeInStatus>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<string, { appraisalAmount: string; adminNotes: string }>
  >({});
  const [liveMessage, setLiveMessage] = useState("");

  const loadTradeIns = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const payload = await adminFetch<unknown>(
        "/api/admin/trade-ins?limit=100",
        { method: "GET" },
        "Trade-in requests could not be loaded."
      );
      setTradeIns(normalizeItems(payload));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Trade-in requests could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTradeIns();
  }, [loadTradeIns]);

  const filteredTradeIns = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return tradeIns.filter((tradeIn) => {
      if (statusFilter !== "ALL" && tradeIn.status !== statusFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [
        tradeIn.name,
        tradeIn.email,
        tradeIn.phone ?? "",
        tradeIn.make,
        tradeIn.model,
        tradeIn.registration ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [deferredQuery, statusFilter, tradeIns]);

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

  function toggleDetails(tradeIn: TradeInItem) {
    setDrafts((current) => ({
      ...current,
      [tradeIn.id]: current[tradeIn.id] ?? {
        appraisalAmount:
          tradeIn.appraisalAmount === null ? "" : String(tradeIn.appraisalAmount),
        adminNotes: tradeIn.adminNotes
      }
    }));
    setExpandedId((current) => (current === tradeIn.id ? null : tradeIn.id));
  }

  async function patchTradeIn(
    tradeIn: TradeInItem,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    if (pendingIds.has(tradeIn.id)) {
      return;
    }

    setPending(tradeIn.id, true);
    setErrors((current) => ({ ...current, [tradeIn.id]: "" }));
    setLiveMessage("");
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/trade-ins/${tradeIn.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        },
        "Trade-in request could not be updated."
      );
      const updated = normalizeTradeIn(payload);
      if (updated) {
        setTradeIns((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        await loadTradeIns();
      }
      setLiveMessage(successMessage);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [tradeIn.id]:
          error instanceof Error
            ? error.message
            : "Trade-in request could not be updated."
      }));
    } finally {
      setPending(tradeIn.id, false);
    }
  }

  async function updateStatus(tradeIn: TradeInItem, status: TradeInStatus) {
    if (status === tradeIn.status) {
      return;
    }
    await patchTradeIn(
      tradeIn,
      { status },
      `${tradeIn.make} ${tradeIn.model} moved to ${titleCase(status)}.`
    );
  }

  async function saveAppraisal(tradeIn: TradeInItem) {
    const draft = drafts[tradeIn.id];
    if (!draft) {
      return;
    }
    const amount = draft.appraisalAmount.trim()
      ? Number(draft.appraisalAmount)
      : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setErrors((current) => ({
        ...current,
        [tradeIn.id]: "Enter an appraisal amount greater than zero."
      }));
      return;
    }

    await patchTradeIn(
      tradeIn,
      {
        appraisalAmount: amount,
        adminNotes: draft.adminNotes.trim() || null
      },
      `${tradeIn.make} ${tradeIn.model} appraisal was saved.`
    );
  }

  if (isLoading) {
    return <TradeInLoading />;
  }

  if (loadError) {
    return <TradeInError message={loadError} onRetry={loadTradeIns} />;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h3 className="text-xl font-black text-ink">Trade-in appraisals</h3>
          <p className="mt-1 text-sm text-ink/65">
            {filteredTradeIns.length} of {tradeIns.length} submissions shown
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative sm:w-64">
            <span className="sr-only">Search trade-in submissions</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/45" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vehicle or customer..."
              className={`${controlClassName} w-full pl-9`}
            />
          </label>
          <label>
            <span className="sr-only">Filter trade-ins by status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | TradeInStatus)
              }
              className={`${controlClassName} w-full sm:w-40`}
            >
              <option value="ALL">All statuses</option>
              {tradeInStatuses.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadTradeIns()}
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
        {filteredTradeIns.length > 0 ? (
          filteredTradeIns.map((tradeIn) => {
            const isPending = pendingIds.has(tradeIn.id);
            const isExpanded = expandedId === tradeIn.id;
            const draft = drafts[tradeIn.id];
            const vehicleLabel = `${tradeIn.year ?? ""} ${tradeIn.make} ${tradeIn.model}`.trim();

            return (
              <article
                key={tradeIn.id}
                aria-busy={isPending}
                className="rounded-md border border-ink/10 bg-white p-4 transition hover:border-ink/25"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="relative hidden h-20 w-24 shrink-0 overflow-hidden rounded-md bg-smoke sm:block">
                      {tradeIn.images[0] ? (
                        <Image
                          src={runtimeImageUrl(tradeIn.images[0].url)}
                          alt={tradeIn.images[0].altText}
                          fill
                          unoptimized={isRuntimeImage(tradeIn.images[0].url)}
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-ink/30">
                          <CarFront className="h-6 w-6" aria-hidden="true" />
                          <span className="sr-only">No trade-in image</span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-ink">{vehicleLabel}</h4>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
                            statusClassName(tradeIn.status)
                          )}
                        >
                          {titleCase(tradeIn.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink/60">
                        <span className="inline-flex items-center gap-1.5">
                          <Gauge className="h-4 w-4" aria-hidden="true" />
                          {formatMileage(tradeIn.mileage)}
                        </span>
                        <span>{tradeIn.condition}</span>
                        {tradeIn.registration ? <span>{tradeIn.registration}</span> : null}
                        <span className="inline-flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4" aria-hidden="true" />
                          {tradeIn.images.length} photo{tradeIn.images.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink/70">
                        Submitted by <span className="font-black text-ink">{tradeIn.name}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/65">
                        {tradeIn.email ? (
                          <a href={`mailto:${tradeIn.email}`} className="inline-flex min-h-8 items-center gap-2 rounded outline-none hover:underline focus:ring-2 focus:ring-ink/20">
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            {tradeIn.email}
                          </a>
                        ) : null}
                        {tradeIn.phone ? (
                          <a href={`tel:${tradeIn.phone}`} className="inline-flex min-h-8 items-center gap-2 rounded outline-none hover:underline focus:ring-2 focus:ring-ink/20">
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            {tradeIn.phone}
                          </a>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span className="text-ink/60">
                          Expected: <strong className="text-ink">{formatCurrency(tradeIn.expectedPrice)}</strong>
                        </span>
                        <span className="text-ink/60">
                          Appraisal: <strong className="text-copper">{formatCurrency(tradeIn.appraisalAmount)}</strong>
                        </span>
                      </div>
                      {errors[tradeIn.id] ? (
                        <p role="alert" className="mt-3 text-sm font-bold text-red-700">
                          {errors[tradeIn.id]}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <span className="inline-flex items-center gap-2 px-2 text-xs font-bold text-ink/55">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Saving
                      </span>
                    ) : null}
                    <label>
                      <span className="sr-only">Status for {vehicleLabel}</span>
                      <select
                        value={tradeIn.status}
                        disabled={isPending}
                        onChange={(event) =>
                          void updateStatus(tradeIn, event.target.value as TradeInStatus)
                        }
                        className={`${controlClassName} min-w-36`}
                      >
                        {tradeInStatuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCase(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleDetails(tradeIn)}
                      aria-expanded={isExpanded}
                      aria-controls={`trade-in-${tradeIn.id}-details`}
                      className="h-11 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
                    >
                      {isExpanded ? "Close details" : "Appraise"}
                    </button>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <div id={`trade-in-${tradeIn.id}-details`} className="mt-4 border-t border-ink/10 pt-4">
                    {tradeIn.images.length > 0 ? (
                      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                        {tradeIn.images.map((image) => (
                          <a
                            key={image.id}
                            href={runtimeImageUrl(image.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-[4/3] overflow-hidden rounded-md bg-smoke outline-none focus:ring-2 focus:ring-ink/30"
                          >
                            <Image
                              src={runtimeImageUrl(image.url)}
                              alt={image.altText}
                              fill
                              unoptimized={isRuntimeImage(image.url)}
                              sizes="(min-width: 1024px) 140px, 25vw"
                              className="object-cover transition group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-md bg-smoke/60 p-3 text-sm leading-6 text-ink/70">
                        <p className="font-black text-ink">Customer description</p>
                        <p className="mt-1 whitespace-pre-line">
                          {tradeIn.notes || "No additional description was supplied."}
                        </p>
                      </div>
                      <div className="grid gap-4">
                        <label className="grid gap-1.5 text-sm font-bold text-ink">
                          Appraisal amount (MYR)
                          <span className="relative">
                            <Banknote className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/40" aria-hidden="true" />
                            <input
                              type="number"
                              min="0"
                              step="100"
                              inputMode="decimal"
                              value={draft.appraisalAmount}
                              disabled={isPending}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [tradeIn.id]: {
                                    ...draft,
                                    appraisalAmount: event.target.value
                                  }
                                }))
                              }
                              placeholder="e.g. 85000"
                              className={`${controlClassName} w-full pl-9`}
                            />
                          </span>
                        </label>
                        <label className="grid gap-1.5 text-sm font-bold text-ink">
                          Internal appraisal notes
                          <textarea
                            value={draft.adminNotes}
                            disabled={isPending}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [tradeIn.id]: { ...draft, adminNotes: event.target.value }
                              }))
                            }
                            rows={4}
                            placeholder="Inspection findings, deductions and offer terms"
                            className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/15"
                          />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void saveAppraisal(tradeIn)}
                            disabled={isPending}
                            className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-white outline-none hover:bg-graphite focus:ring-2 focus:ring-ink/30 focus:ring-offset-2 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            Save appraisal
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ink/20 bg-smoke/25 px-5 text-center">
            <div>
              <CarFront className="mx-auto h-8 w-8 text-ink/30" aria-hidden="true" />
              <h4 className="mt-3 font-black text-ink">No trade-ins found</h4>
              <p className="mt-1 text-sm text-ink/60">
                Adjust the filters or wait for a new customer appraisal request.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("ALL");
                }}
                className="mt-4 h-11 rounded-md border border-ink/15 bg-white px-4 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeInLoading() {
  return (
    <div role="status" className="grid min-h-72 place-items-center rounded-md border border-dashed border-ink/15 bg-smoke/35 text-center">
      <div>
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-copper" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-ink/65">Loading trade-in requests</p>
      </div>
    </div>
  );
}

function TradeInError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid min-h-72 place-items-center rounded-md border border-red-200 bg-red-50/50 px-5 text-center">
      <div>
        <h3 className="font-black text-red-900">Trade-ins unavailable</h3>
        <p className="mt-1 text-sm text-red-800">{message}</p>
        <button type="button" onClick={onRetry} className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-300">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}

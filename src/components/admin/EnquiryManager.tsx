"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  Phone,
  Search,
  Trash2,
  X
} from "lucide-react";
import type { EnquiryStatus } from "@prisma/client";
import type { AdminEnquiry } from "@/types/admin";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminFetch } from "@/components/admin/adminFetch";
import { titleCaseEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

type EnquiryStatusFilter = "ALL" | EnquiryStatus;

const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "CLOSED", "ARCHIVED"];
const controlClassName =
  "h-11 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatReceivedAt(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function EnquiryManager({
  enquiries,
  onChange,
  statusFilter,
  onStatusFilterChange
}: {
  enquiries: AdminEnquiry[];
  onChange: Dispatch<SetStateAction<AdminEnquiry[]>>;
  statusFilter: EnquiryStatusFilter;
  onStatusFilterChange: (status: EnquiryStatusFilter) => void;
}) {
  const [query, setQuery] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const filteredEnquiries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return enquiries.filter((enquiry) => {
      const matchesStatus =
        statusFilter === "ALL" || enquiry.status === statusFilter;
      const searchable = [
        enquiry.name,
        enquiry.email,
        enquiry.phone ?? "",
        enquiry.message,
        enquiry.car?.brand ?? "",
        enquiry.car?.model ?? "",
        enquiry.car?.year ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [enquiries, query, statusFilter]);

  function setPending(id: string, isPending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);

      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  function clearError(id: string) {
    setErrors((current) => {
      if (!current[id]) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function updateStatus(enquiry: AdminEnquiry, status: EnquiryStatus) {
    if (status === enquiry.status || pendingIds.has(enquiry.id)) {
      return;
    }

    const previousStatus = enquiry.status;
    clearError(enquiry.id);
    setLiveMessage("");
    setPending(enquiry.id, true);
    onChange((current) =>
      current.map((item) =>
        item.id === enquiry.id ? { ...item, status } : item
      )
    );

    try {
      await adminFetch<{ status: EnquiryStatus }>(
        `/api/admin/enquiries/${enquiry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        },
        "Enquiry could not be updated."
      );
      setLiveMessage(
        `${enquiry.name}'s enquiry is now ${titleCaseEnum(status)}.`
      );
    } catch (error) {
      onChange((current) =>
        current.map((item) =>
          item.id === enquiry.id ? { ...item, status: previousStatus } : item
        )
      );
      setErrors((current) => ({
        ...current,
        [enquiry.id]: errorMessage(error, "Enquiry could not be updated.")
      }));
    } finally {
      setPending(enquiry.id, false);
    }
  }

  async function remove(enquiry: AdminEnquiry) {
    if (pendingIds.has(enquiry.id)) {
      return;
    }

    clearError(enquiry.id);
    setLiveMessage("");
    setPending(enquiry.id, true);

    try {
      await adminFetch<{ id: string }>(
        `/api/admin/enquiries/${enquiry.id}`,
        { method: "DELETE" },
        "Enquiry could not be deleted."
      );
      onChange((current) => current.filter((item) => item.id !== enquiry.id));
      setConfirmDeleteId(null);
      setLiveMessage(`${enquiry.name}'s archived enquiry was deleted.`);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [enquiry.id]: errorMessage(error, "Enquiry could not be deleted.")
      }));
    } finally {
      setPending(enquiry.id, false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">Customer enquiries</h2>
          <p className="mt-1 text-sm text-ink/65">
            {filteredEnquiries.length} of {enquiries.length} enquiries shown
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block min-w-0 sm:w-72">
            <span className="sr-only">Search enquiries</span>
            <Search
              className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/50"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, vehicle..."
              className={`${controlClassName} w-full pl-9 pr-9`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear enquiry search"
                className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-ink/60 outline-none hover:bg-ink/5 focus:ring-2 focus:ring-ink/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <label>
            <span className="sr-only">Filter enquiries by status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(
                  event.target.value as EnquiryStatusFilter
                )
              }
              className={`${controlClassName} w-full sm:w-44`}
            >
              <option value="ALL">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {titleCaseEnum(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      <div className="mt-4 grid gap-3">
        {filteredEnquiries.length > 0 ? (
          filteredEnquiries.map((enquiry) => {
            const isPending = pendingIds.has(enquiry.id);
            const isExpanded = expandedIds.has(enquiry.id);
            const isArchived = enquiry.status === "ARCHIVED";
            const isConfirmingDelete = confirmDeleteId === enquiry.id;

            return (
              <article
                key={enquiry.id}
                aria-busy={isPending}
                className={cn(
                  "rounded-md border bg-white p-4 transition hover:border-ink/25",
                  isArchived ? "border-ink/10 bg-zinc-50/70" : "border-ink/10"
                )}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-ink">
                        {enquiry.name}
                      </h3>
                      <StatusBadge status={enquiry.status} />
                      <span className="text-xs font-semibold text-ink/60">
                        Received {formatReceivedAt(enquiry.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <a
                        href={`mailto:${enquiry.email}`}
                        className="inline-flex min-h-9 max-w-full items-center gap-2 rounded text-ink/75 outline-none hover:text-ink hover:underline focus:ring-2 focus:ring-ink/20"
                      >
                        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="break-all">{enquiry.email}</span>
                      </a>
                      {enquiry.phone ? (
                        <a
                          href={`tel:${enquiry.phone}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded text-ink/75 outline-none hover:text-ink hover:underline focus:ring-2 focus:ring-ink/20"
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          {enquiry.phone}
                        </a>
                      ) : null}
                      {enquiry.car ? (
                        <Link
                          href={`/cars/${enquiry.car.slug}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded font-bold text-copper outline-none hover:text-ink hover:underline focus:ring-2 focus:ring-ink/20"
                        >
                          {enquiry.car.year} {enquiry.car.brand}{" "}
                          {enquiry.car.model}
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      ) : (
                        <span className="inline-flex min-h-9 items-center text-sm text-ink/60">
                          General enquiry
                        </span>
                      )}
                    </div>

                    <p
                      className={cn(
                        "mt-3 whitespace-pre-line text-sm leading-6 text-ink/75",
                        !isExpanded && "line-clamp-3"
                      )}
                    >
                      {enquiry.message}
                    </p>
                    {enquiry.message.length > 220 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(enquiry.id)}
                        className="mt-2 inline-flex min-h-9 items-center gap-1 rounded text-xs font-bold text-ink/65 outline-none hover:text-ink focus:ring-2 focus:ring-ink/20"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {isExpanded ? "Show less" : "Read full message"}
                      </button>
                    ) : null}

                    {errors[enquiry.id] ? (
                      <p
                        role="alert"
                        className="mt-3 text-sm font-semibold text-red-700"
                      >
                        {errors[enquiry.id]}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:max-w-md xl:justify-end">
                    {isPending ? (
                      <span className="inline-flex items-center gap-2 px-2 text-xs font-bold text-ink/60">
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Saving
                      </span>
                    ) : null}
                    <label>
                      <span className="sr-only">
                        Status for {enquiry.name}&apos;s enquiry
                      </span>
                      <select
                        value={enquiry.status}
                        disabled={isPending}
                        onChange={(event) =>
                          updateStatus(
                            enquiry,
                            event.target.value as EnquiryStatus
                          )
                        }
                        className={`${controlClassName} min-w-32`}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCaseEnum(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => updateStatus(enquiry, "CONTACTED")}
                        disabled={isPending}
                        className="inline-flex h-11 items-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink/70 outline-none transition hover:border-ink/30 hover:bg-smoke focus:ring-2 focus:ring-ink/20 disabled:opacity-45"
                      >
                        <ArchiveRestore
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateStatus(enquiry, "ARCHIVED")}
                        disabled={isPending}
                        className="inline-flex h-11 items-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink/70 outline-none transition hover:border-ink/30 hover:bg-smoke focus:ring-2 focus:ring-ink/20 disabled:opacity-45"
                      >
                        <Archive className="h-4 w-4" aria-hidden="true" />
                        Archive
                      </button>
                    )}

                    {isArchived ? (
                      isConfirmingDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isPending}
                            className="h-11 rounded-md px-3 text-sm font-bold text-ink/70 outline-none hover:bg-ink/5 focus:ring-2 focus:ring-ink/20"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(enquiry)}
                            disabled={isPending}
                            className="h-11 rounded-md bg-red-700 px-3 text-sm font-bold text-white outline-none hover:bg-red-800 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-45"
                          >
                            Delete permanently
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(enquiry.id)}
                          disabled={isPending}
                          className="grid h-11 w-11 place-items-center rounded-md text-red-700 outline-none transition hover:bg-red-50 focus:ring-2 focus:ring-red-300 focus:ring-offset-2 disabled:opacity-45"
                          aria-label={`Permanently delete ${enquiry.name}'s archived enquiry`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center">
            <div>
              <Inbox
                className="mx-auto h-8 w-8 text-ink/35"
                aria-hidden="true"
              />
              <h3 className="mt-3 font-black text-ink">No matching enquiries</h3>
              <p className="mt-1 text-sm text-ink/65">
                Adjust the search or status filter to see more enquiries.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  onStatusFilterChange("ALL");
                }}
                className="mt-4 h-11 rounded-md border border-ink/15 px-4 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
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

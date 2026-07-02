"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Phone, Trash2 } from "lucide-react";
import type { EnquiryStatus } from "@prisma/client";
import type { AdminEnquiry } from "@/types/admin";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { titleCaseEnum } from "@/lib/format";

const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "CLOSED", "ARCHIVED"];

export function EnquiryManager({
  enquiries,
  onChange
}: {
  enquiries: AdminEnquiry[];
  onChange: (enquiries: AdminEnquiry[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function updateStatus(enquiry: AdminEnquiry, status: EnquiryStatus) {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Enquiry could not be updated.");
        return;
      }

      onChange(
        enquiries.map((item) => (item.id === enquiry.id ? { ...item, status } : item))
      );
    });
  }

  function remove(enquiry: AdminEnquiry) {
    if (!window.confirm("Delete this enquiry?")) {
      return;
    }

    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: "DELETE"
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Enquiry could not be deleted.");
        return;
      }

      onChange(enquiries.filter((item) => item.id !== enquiry.id));
    });
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-ink">Customer enquiries</h2>
          <p className="text-sm text-ink/55">{enquiries.length} total conversations</p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="mt-5 grid gap-4">
        {enquiries.length > 0 ? (
          enquiries.map((enquiry) => (
            <article
              key={enquiry.id}
              className="rounded-md border border-ink/10 bg-smoke p-4 transition hover:border-ink/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-ink">{enquiry.name}</h3>
                    <StatusBadge status={enquiry.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink/60">
                    <a href={`mailto:${enquiry.email}`} className="inline-flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {enquiry.email}
                    </a>
                    {enquiry.phone ? (
                      <a href={`tel:${enquiry.phone}`} className="inline-flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {enquiry.phone}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={enquiry.status}
                    disabled={isPending}
                    onChange={(event) =>
                      updateStatus(enquiry, event.target.value as EnquiryStatus)
                    }
                    className="h-10 rounded-md border border-ink/10 bg-white px-3 text-sm outline-none focus:border-ink/35"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCaseEnum(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(enquiry)}
                    className="grid h-10 w-10 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                    aria-label="Delete enquiry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {enquiry.car ? (
                <Link
                  href={`/cars/${enquiry.car.slug}`}
                  className="mt-4 inline-flex text-sm font-bold text-copper transition hover:text-ink"
                >
                  {enquiry.car.year} {enquiry.car.brand} {enquiry.car.model}
                </Link>
              ) : null}

              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/70">
                {enquiry.message}
              </p>
              <p className="mt-3 text-xs text-ink/40">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(enquiry.createdAt))}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/55">
            No customer enquiries yet.
          </div>
        )}
      </div>
    </section>
  );
}

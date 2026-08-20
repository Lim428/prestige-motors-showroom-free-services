"use client";

import { useEffect, useId, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  History,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";
import { trackGrowthEvent } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

type InspectionStatus = "NOT_INSPECTED" | "IN_PROGRESS" | "VERIFIED" | "NEEDS_ATTENTION";

type TrustProfile = {
  inspectionStatus: InspectionStatus;
  inspectionScore: number | null;
  inspectionSummary: string | null;
  serviceHistorySummary: string | null;
  warrantyMonths: number | null;
  warrantyProvider: string | null;
  ownershipCount: number | null;
  accidentFree: boolean | null;
  lastInspectedAt: string | null;
  reportUrl: string | null;
  updatedAt: string;
};

type TrustDocument = {
  id: string;
  category: "INSPECTION_REPORT" | "SERVICE_RECORD" | "WARRANTY" | "CERTIFICATE" | "OTHER";
  title: string;
  url: string;
  issuedAt: string | null;
  expiresAt: string | null;
  verified: true;
};

type TrustResponse = {
  car: { id: string; slug: string; brand: string; model: string; year: number };
  profile: TrustProfile | null;
  documents: TrustDocument[];
};

export type TrustPackProps = {
  carId: string;
  vehicleName?: string;
  className?: string;
};

function dateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function statusLabel(status: InspectionStatus) {
  switch (status) {
    case "VERIFIED":
      return "Inspection verified";
    case "IN_PROGRESS":
      return "Inspection in progress";
    case "NEEDS_ATTENTION":
      return "Items need attention";
    default:
      return "Not yet inspected";
  }
}

function documentCategoryLabel(category: TrustDocument["category"]) {
  return category.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function TrustPack({ carId, vehicleName, className }: TrustPackProps) {
  const id = useId();
  const [data, setData] = useState<TrustResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/cars/${encodeURIComponent(carId)}/trust`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(result.error ?? "Vehicle trust details could not be loaded.");
        }

        return (await response.json()) as { data?: TrustResponse };
      })
      .then((result) => {
        setData(result.data ?? null);
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }

        setError(reason instanceof Error ? reason.message : "Vehicle trust details could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [carId]);

  const profile = data?.profile;
  const resolvedName = vehicleName ?? (data ? `${data.car.year} ${data.car.brand} ${data.car.model}` : "this vehicle");
  const reportUrl =
    profile?.inspectionStatus === "VERIFIED"
      ? `/api/cars/${encodeURIComponent(data?.car.id ?? carId)}/trust-report`
      : profile?.reportUrl ??
        data?.documents.find((item) => item.category === "INSPECTION_REPORT")?.url;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white shadow-panel",
        className
      )}
    >
      <div className="bg-[linear-gradient(135deg,#0f5847_0%,#173d35_100%)] p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/12 text-champagne ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-champagne">
                Vehicle trust pack
              </p>
              <h2 id={`${id}-title`} className="mt-2 text-2xl font-black tracking-tight">
                Evidence before promises
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Inspection, history, warranty, ownership, and verified documents for {resolvedName}.
              </p>
            </div>
          </div>
          {profile?.inspectionStatus === "VERIFIED" ? (
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-3 py-2 text-xs font-black text-racing">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Verified profile
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading trust details" aria-busy="true">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-smoke" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            {error}
          </div>
        ) : !profile ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-smoke p-6 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-copper" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-black text-ink">Trust profile being prepared</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink/55">
              Verified inspection and history information has not been published for this vehicle
              yet. Ask the showroom for the latest supporting records.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-smoke p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-racing">
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {profile.inspectionScore !== null ? (
                    <span className="text-xl font-black text-ink">{profile.inspectionScore}<span className="text-xs text-ink/40">/100</span></span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-sm font-black text-ink">{statusLabel(profile.inspectionStatus)}</h3>
                <p className="mt-1 text-xs leading-5 text-ink/55">
                  {profile.inspectionSummary || (profile.lastInspectedAt ? `Last inspected ${dateLabel(profile.lastInspectedAt)}.` : "Ask the showroom for current inspection details.")}
                </p>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-smoke p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-racing">
                  <History className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-black text-ink">Service history</h3>
                <p className="mt-1 text-xs leading-5 text-ink/55">
                  {profile.serviceHistorySummary || "No service-history summary has been published yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-smoke p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-racing">
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-black text-ink">Warranty coverage</h3>
                <p className="mt-1 text-xs leading-5 text-ink/55">
                  {profile.warrantyMonths
                    ? `${profile.warrantyMonths}-month coverage${profile.warrantyProvider ? ` by ${profile.warrantyProvider}` : ""}. Confirm terms with the showroom.`
                    : "No warranty coverage has been recorded for this vehicle."}
                </p>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-smoke p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-racing">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-black text-ink">Ownership &amp; accident profile</h3>
                <p className="mt-1 text-xs leading-5 text-ink/55">
                  {profile.ownershipCount !== null
                    ? `${profile.ownershipCount} previous ${profile.ownershipCount === 1 ? "owner" : "owners"}. `
                    : "Ownership count not recorded. "}
                  {profile.accidentFree === true
                    ? "Recorded as accident-free."
                    : profile.accidentFree === false
                      ? "An accident record is disclosed; ask for details."
                      : "Accident history not recorded."}
                </p>
              </div>
            </div>

            {data && data.documents.length > 0 ? (
              <div className="mt-6 border-t border-ink/10 pt-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-black text-ink">
                      <FileCheck2 className="h-5 w-5 text-copper" aria-hidden="true" />
                      Verified documents
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-ink/50">Only dealer-verified public documents appear here.</p>
                  </div>
                  <span className="rounded-full bg-racing/10 px-2.5 py-1 text-xs font-black text-racing">
                    {data.documents.length}
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-ink/10 rounded-xl border border-ink/10">
                  {data.documents.map((document) => (
                    <li key={document.id} className="flex items-center gap-3 p-3 sm:p-4">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-ink">{document.title}</p>
                        <p className="mt-0.5 text-xs text-ink/45">
                          {documentCategoryLabel(document.category)}
                          {document.issuedAt ? ` · Issued ${dateLabel(document.issuedAt)}` : ""}
                        </p>
                      </div>
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-ink/10 bg-smoke px-3 text-xs font-black text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing"
                      >
                        Open<span className="sr-only"> {document.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {reportUrl ? (
              <a
                href={reportUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackGrowthEvent("TRUST_REPORT_DOWNLOADED", { carId: data?.car.id ?? carId })}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-racing px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-racing/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/30 focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Open full inspection report
              </a>
            ) : null}
          </>
        )}

        <p className="mt-5 text-xs leading-5 text-ink/45">
          Trust-pack information supports your evaluation but does not replace an independent
          inspection, document verification, or the final sale agreement.
        </p>
      </div>
    </section>
  );
}

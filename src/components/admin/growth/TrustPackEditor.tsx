"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CarFront,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { adminFetch } from "@/components/admin/adminFetch";

type CarOption = {
  id: string;
  slug: string;
  label: string;
};

type TrustDocumentDraft = {
  localId: string;
  category: string;
  title: string;
  url: string;
  issuedAt: string;
  expiresAt: string;
  verified: boolean;
};

type TrustProfileDraft = {
  inspectionStatus: string;
  inspectionScore: string;
  inspectionSummary: string;
  serviceHistorySummary: string;
  warrantyMonths: string;
  warrantyProvider: string;
  ownershipCount: string;
  accidentFree: "" | "true" | "false";
  lastInspectedAt: string;
  reportUrl: string;
};

const inspectionStatuses = [
  "NOT_INSPECTED",
  "IN_PROGRESS",
  "VERIFIED",
  "NEEDS_ATTENTION"
];

const documentCategories = [
  "INSPECTION_REPORT",
  "SERVICE_RECORD",
  "WARRANTY",
  "CERTIFICATE",
  "OTHER"
];

const emptyProfile: TrustProfileDraft = {
  inspectionStatus: "NOT_INSPECTED",
  inspectionScore: "",
  inspectionSummary: "",
  serviceHistorySummary: "",
  warrantyMonths: "",
  warrantyProvider: "",
  ownershipCount: "",
  accidentFree: "",
  lastInspectedAt: "",
  reportUrl: ""
};

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

function asNumberText(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : typeof value === "string"
      ? value
      : "";
}

function dateInput(value: unknown) {
  const text = asText(value);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueValues(defaults: string[], currentValues: string[]) {
  return Array.from(new Set([...defaults, ...currentValues.filter(Boolean)]));
}

function newDocument(): TrustDocumentDraft {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: "INSPECTION_REPORT",
    title: "",
    url: "",
    issuedAt: "",
    expiresAt: "",
    verified: false
  };
}

function normalizeCars(payload: unknown) {
  const items = Array.isArray(payload)
    ? payload
    : (() => {
        const record = asRecord(payload);
        return record && Array.isArray(record.items) ? record.items : [];
      })();

  return items.flatMap((item) => {
    const car = asRecord(item);
    if (!car || typeof car.id !== "string") return [];
    const parts = [car.year, car.brand, car.model].filter(
      (part) => typeof part === "string" || typeof part === "number"
    );
    return [
      {
        id: car.id,
        slug: asText(car.slug),
        label: parts.length > 0 ? parts.join(" ") : "Unnamed vehicle"
      }
    ];
  });
}

function normalizeTrust(payload: unknown) {
  const record = asRecord(payload);
  const profile = record ? asRecord(record.profile) : null;
  const rawDocuments = record && Array.isArray(record.documents) ? record.documents : [];

  const draft: TrustProfileDraft = profile
    ? {
        inspectionStatus: asText(profile.inspectionStatus, "NOT_INSPECTED"),
        inspectionScore: asNumberText(profile.inspectionScore),
        inspectionSummary: asText(profile.inspectionSummary),
        serviceHistorySummary: asText(profile.serviceHistorySummary),
        warrantyMonths: asNumberText(profile.warrantyMonths),
        warrantyProvider: asText(profile.warrantyProvider),
        ownershipCount: asNumberText(profile.ownershipCount),
        accidentFree:
          typeof profile.accidentFree === "boolean"
            ? profile.accidentFree
              ? "true"
              : "false"
            : "",
        lastInspectedAt: dateInput(profile.lastInspectedAt),
        reportUrl: asText(profile.reportUrl)
      }
    : { ...emptyProfile };

  const documents = rawDocuments.flatMap((item, index) => {
    const document = asRecord(item);
    if (!document) return [];
    return [
      {
        localId: asText(document.id, `document-${index}`),
        category: asText(document.category, "OTHER"),
        title: asText(document.title),
        url: asText(document.url),
        issuedAt: dateInput(document.issuedAt),
        expiresAt: dateInput(document.expiresAt),
        verified: document.verified === true
      }
    ];
  });

  return { profile: draft, documents };
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function optionalIsoDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function malaysiaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function TrustPackEditor() {
  const trustRequestIdRef = useRef(0);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [profile, setProfile] = useState<TrustProfileDraft>({ ...emptyProfile });
  const [documents, setDocuments] = useState<TrustDocumentDraft[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(true);
  const [isLoadingTrust, setIsLoadingTrust] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCar = useMemo(
    () => cars.find((car) => car.id === selectedCarId) ?? null,
    [cars, selectedCarId]
  );
  const statusOptions = useMemo(
    () => uniqueValues(inspectionStatuses, [profile.inspectionStatus]),
    [profile.inspectionStatus]
  );
  const categoryOptions = useMemo(
    () => uniqueValues(documentCategories, documents.map((document) => document.category)),
    [documents]
  );
  const verificationChecks = useMemo(
    () => [
      {
        label: "Inspection summary completed",
        complete: Boolean(profile.inspectionSummary.trim())
      },
      {
        label: "Last inspection date recorded",
        complete:
          Boolean(profile.lastInspectedAt) &&
          profile.lastInspectedAt <= malaysiaToday()
      },
      {
        label: "At least one supporting document verified by the dealership",
        complete: documents.some(
          (document) =>
            document.verified &&
            Boolean(document.title.trim()) &&
            isHttpUrl(document.url)
        )
      }
    ],
    [documents, profile.inspectionSummary, profile.lastInspectedAt]
  );
  const verificationReady = verificationChecks.every((check) => check.complete);

  const loadCars = useCallback(async () => {
    setIsLoadingCars(true);
    setError("");
    try {
      const payload = await adminFetch<unknown>(
        "/api/admin/cars",
        { method: "GET" },
        "Vehicle inventory could not be loaded."
      );
      setCars(normalizeCars(payload));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Vehicle inventory could not be loaded."
      );
    } finally {
      setIsLoadingCars(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCars(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCars]);

  const loadTrustPack = useCallback(async (carId: string) => {
    const requestId = ++trustRequestIdRef.current;

    if (!carId) {
      setProfile({ ...emptyProfile });
      setDocuments([]);
      setIsLoadingTrust(false);
      return;
    }
    setIsLoadingTrust(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/cars/${carId}/trust`,
        { method: "GET" },
        "Vehicle trust pack could not be loaded."
      );
      if (requestId !== trustRequestIdRef.current) return;

      const normalized = normalizeTrust(payload);
      setProfile(normalized.profile);
      setDocuments(normalized.documents);
    } catch (loadError) {
      if (requestId !== trustRequestIdRef.current) return;

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Vehicle trust pack could not be loaded."
      );
    } finally {
      if (requestId === trustRequestIdRef.current) {
        setIsLoadingTrust(false);
      }
    }
  }, []);

  function chooseCar(carId: string) {
    setSelectedCarId(carId);
    void loadTrustPack(carId);
  }

  function updateDocument(localId: string, patch: Partial<TrustDocumentDraft>) {
    setDocuments((current) =>
      current.map((document) =>
        document.localId === localId ? { ...document, ...patch } : document
      )
    );
  }

  async function saveTrustPack() {
    if (!selectedCarId) return;
    setError("");
    setSuccessMessage("");

    const inspectionScore = nullableNumber(profile.inspectionScore);
    const warrantyMonths = nullableNumber(profile.warrantyMonths);
    const ownershipCount = nullableNumber(profile.ownershipCount);
    if (
      Number.isNaN(inspectionScore) ||
      Number.isNaN(warrantyMonths) ||
      Number.isNaN(ownershipCount)
    ) {
      setError("Inspection score, warranty months and ownership count must be valid numbers.");
      return;
    }
    if (inspectionScore !== null && (inspectionScore < 0 || inspectionScore > 100)) {
      setError("Inspection score must be between 0 and 100.");
      return;
    }

    const incompleteDocument = documents.find(
      (document) => !document.title.trim() || !isHttpUrl(document.url)
    );
    if (incompleteDocument) {
      setError("Every trust document needs a title and a valid HTTP/HTTPS URL before saving.");
      return;
    }
    if (profile.inspectionStatus === "VERIFIED" && !verificationReady) {
      setError(
        "Complete the inspection summary, inspection date and at least one dealership-verified supporting document before publishing a Verified trust pack."
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/cars/${selectedCarId}/trust`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inspectionStatus: profile.inspectionStatus,
            inspectionScore,
            inspectionSummary: profile.inspectionSummary.trim() || null,
            serviceHistorySummary: profile.serviceHistorySummary.trim() || null,
            warrantyMonths,
            warrantyProvider: profile.warrantyProvider.trim() || null,
            ownershipCount,
            accidentFree:
              profile.accidentFree === "" ? null : profile.accidentFree === "true",
            lastInspectedAt: optionalIsoDate(profile.lastInspectedAt),
            reportUrl: profile.reportUrl.trim() || null,
            documents: documents.map((document) => ({
              category: document.category,
              title: document.title.trim(),
              url: document.url.trim(),
              issuedAt: optionalIsoDate(document.issuedAt),
              expiresAt: optionalIsoDate(document.expiresAt),
              verified: document.verified
            }))
          })
        },
        "Vehicle trust pack could not be saved."
      );
      const normalized = normalizeTrust(payload);
      setProfile(normalized.profile);
      setDocuments(normalized.documents);
      setSuccessMessage(`${selectedCar?.label ?? "Vehicle"} trust pack was saved.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Vehicle trust pack could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b-2 border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-signal">Evidence desk</p>
          <h3 className="mt-1 font-display text-2xl font-black uppercase leading-none tracking-wide text-ink">Vehicle trust packs</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/65">
            Publish inspection evidence, service history and warranty details that
            help buyers purchase with confidence.
          </p>
        </div>
        {selectedCar?.slug ? (
          <Link
            href={`/cars/${selectedCar.slug}`}
            className="inline-flex h-11 items-center justify-center gap-2 border border-ink/20 px-3 text-sm font-bold text-ink outline-none hover:border-ink hover:bg-smoke focus:ring-2 focus:ring-signal/20"
          >
            View listing
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 border border-ink/15 border-l-4 border-l-signal bg-smoke/35 p-4">
        <label className="grid gap-1.5 text-sm font-black text-ink">
          Select a vehicle
          <select
            value={selectedCarId}
            disabled={isLoadingCars || isSaving}
            onChange={(event) => chooseCar(event.target.value)}
            className={`${controlClassName} w-full sm:max-w-xl`}
          >
            <option value="">
              {isLoadingCars ? "Loading inventory..." : "Choose a vehicle to edit"}
            </option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.label}
              </option>
            ))}
          </select>
        </label>
        {!isLoadingCars && cars.length === 0 && !error ? (
          <p className="mt-2 text-sm text-ink/60">Add inventory before creating a trust pack.</p>
        ) : null}
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-3">
        {error ? (
          <div role="alert" className="flex flex-col gap-3 border border-red-200 border-l-4 border-l-red-600 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-red-800">{error}</p>
            <button
              type="button"
              onClick={() =>
                selectedCarId ? void loadTrustPack(selectedCarId) : void loadCars()
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-red-300 bg-white px-3 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-300"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : null}
        {successMessage ? (
          <p className="border border-emerald-200 border-l-4 border-l-emerald-600 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {successMessage}
          </p>
        ) : null}
      </div>

      {isLoadingTrust ? (
        <div role="status" className="mt-4 grid min-h-72 place-items-center border border-dashed border-ink/20 bg-smoke/30 text-center">
          <div>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-signal" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink/60">Loading trust pack</p>
          </div>
        </div>
      ) : selectedCarId ? (
        <div className="mt-5 grid gap-5">
          <section aria-labelledby="inspection-title" className="border border-ink/15 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center bg-signal text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h4 id="inspection-title" className="font-display text-lg font-black uppercase leading-none tracking-wide text-ink">Inspection and ownership</h4>
                <p className="text-xs text-ink/55">Core proof displayed on the public vehicle page</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-bold text-ink">
                Inspection status
                <select value={profile.inspectionStatus} onChange={(event) => setProfile((current) => ({ ...current, inspectionStatus: event.target.value }))} className={controlClassName}>
                  {statusOptions.map((status) => <option key={status} value={status}>{titleCase(status)}{status === "VERIFIED" ? " — evidence required" : ""}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-ink">
                Inspection score (0–100)
                <input type="number" min="0" max="100" value={profile.inspectionScore} onChange={(event) => setProfile((current) => ({ ...current, inspectionScore: event.target.value }))} className={controlClassName} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-ink">
                Last inspection date
                <input type="date" max={malaysiaToday()} value={profile.lastInspectedAt} onChange={(event) => setProfile((current) => ({ ...current, lastInspectedAt: event.target.value }))} className={controlClassName} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-ink">
                Previous owners
                <input type="number" min="0" value={profile.ownershipCount} onChange={(event) => setProfile((current) => ({ ...current, ownershipCount: event.target.value }))} className={controlClassName} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-ink">
                Accident-free record
                <select value={profile.accidentFree} onChange={(event) => setProfile((current) => ({ ...current, accidentFree: event.target.value as TrustProfileDraft["accidentFree"] }))} className={controlClassName}>
                  <option value="">Not verified</option>
                  <option value="true">Verified accident-free</option>
                  <option value="false">Has disclosed accident history</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-ink">
                Full report URL
                <input type="url" value={profile.reportUrl} onChange={(event) => setProfile((current) => ({ ...current, reportUrl: event.target.value }))} placeholder="https://..." className={controlClassName} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-ink sm:col-span-2 xl:col-span-3">
                Inspection summary
                <textarea value={profile.inspectionSummary} onChange={(event) => setProfile((current) => ({ ...current, inspectionSummary: event.target.value }))} rows={3} placeholder="Key inspection findings and condition highlights" className="border border-ink/20 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none hover:border-ink/35 focus:border-signal focus:ring-2 focus:ring-signal/15" />
              </label>
            </div>
            <div
              id="trust-verification-requirements"
              aria-live="polite"
              className={`mt-4 border border-l-4 p-3 ${
                verificationReady
                  ? "border-emerald-200 border-l-emerald-600 bg-emerald-50"
                  : "border-amber-200 border-l-amber-500 bg-amber-50"
              }`}
            >
              <p className={`text-sm font-black ${verificationReady ? "text-emerald-900" : "text-amber-950"}`}>
                {verificationReady
                  ? "Evidence complete — this pack can be published as Verified."
                  : "Evidence required before Verified can be published"}
              </p>
              <p className={`mt-1 text-xs leading-5 ${verificationReady ? "text-emerald-800" : "text-amber-900"}`}>
                Drafts can be saved as In progress. A verified badge and generated PDF are only available after every requirement below is complete.
              </p>
              <ul className="mt-2 grid gap-1.5 text-xs font-bold sm:grid-cols-3">
                {verificationChecks.map((check) => (
                  <li
                    key={check.label}
                    className={`flex items-start gap-2 ${check.complete ? "text-emerald-800" : "text-amber-950"}`}
                  >
                    <span aria-hidden="true">{check.complete ? "✓" : "○"}</span>
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="history-title" className="border border-ink/15 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center bg-signal text-white"><BadgeCheck className="h-5 w-5" aria-hidden="true" /></span>
              <div><h4 id="history-title" className="font-display text-lg font-black uppercase leading-none tracking-wide text-ink">Service history and warranty</h4><p className="mt-1 text-xs text-ink/55">Coverage and maintenance confidence</p></div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-ink">Warranty provider<input value={profile.warrantyProvider} onChange={(event) => setProfile((current) => ({ ...current, warrantyProvider: event.target.value }))} className={controlClassName} /></label>
              <label className="grid gap-1.5 text-sm font-bold text-ink">Warranty duration (months)<input type="number" min="0" value={profile.warrantyMonths} onChange={(event) => setProfile((current) => ({ ...current, warrantyMonths: event.target.value }))} className={controlClassName} /></label>
              <label className="grid gap-1.5 text-sm font-bold text-ink sm:col-span-2">Service history summary<textarea value={profile.serviceHistorySummary} onChange={(event) => setProfile((current) => ({ ...current, serviceHistorySummary: event.target.value }))} rows={3} placeholder="Service intervals, workshops and notable maintenance" className="border border-ink/20 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none hover:border-ink/35 focus:border-signal focus:ring-2 focus:ring-signal/15" /></label>
            </div>
          </section>

          <section aria-labelledby="documents-title" className="border border-ink/15 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center bg-ink text-white"><FileCheck2 className="h-5 w-5" aria-hidden="true" /></span>
                <div><h4 id="documents-title" className="font-display text-lg font-black uppercase leading-none tracking-wide text-ink">Verified documents</h4><p className="mt-1 text-xs text-ink/55">Only checked items are shown as verified</p></div>
              </div>
              <button type="button" onClick={() => setDocuments((current) => [...current, newDocument()])} className="inline-flex h-11 items-center justify-center gap-2 border border-ink/20 px-3 text-sm font-bold text-ink outline-none hover:border-ink hover:bg-smoke focus:ring-2 focus:ring-signal/20"><FilePlus2 className="h-4 w-4" aria-hidden="true" />Add document</button>
            </div>

            <div className="mt-4 grid gap-3">
              {documents.length > 0 ? documents.map((document, index) => (
                <fieldset key={document.localId} className="border border-ink/15 bg-smoke/25 p-3">
                  <legend className="px-1 text-xs font-black uppercase tracking-wide text-ink/50">Document {index + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="grid gap-1.5 text-sm font-bold text-ink">Category<select value={document.category} onChange={(event) => updateDocument(document.localId, { category: event.target.value })} className={controlClassName}>{categoryOptions.map((category) => <option key={category} value={category}>{titleCase(category)}</option>)}</select></label>
                    <label className="grid gap-1.5 text-sm font-bold text-ink sm:col-span-1 xl:col-span-2">Title<input value={document.title} onChange={(event) => updateDocument(document.localId, { title: event.target.value })} placeholder="e.g. 120-point inspection report" className={controlClassName} /></label>
                    <label className="grid gap-1.5 text-sm font-bold text-ink">Document URL<input type="url" value={document.url} onChange={(event) => updateDocument(document.localId, { url: event.target.value })} placeholder="https://..." className={controlClassName} /></label>
                    <label className="grid gap-1.5 text-sm font-bold text-ink">Issued date<input type="date" value={document.issuedAt} onChange={(event) => updateDocument(document.localId, { issuedAt: event.target.value })} className={controlClassName} /></label>
                    <label className="grid gap-1.5 text-sm font-bold text-ink">Expiry date<input type="date" value={document.expiresAt} onChange={(event) => updateDocument(document.localId, { expiresAt: event.target.value })} className={controlClassName} /></label>
                    <label className="inline-flex min-h-11 items-center gap-2 self-end text-sm font-bold text-ink/70"><input type="checkbox" checked={document.verified} onChange={(event) => updateDocument(document.localId, { verified: event.target.checked })} className="h-4 w-4 rounded border-ink/20 text-ink focus:ring-ink/20" />Verified by dealership</label>
                    <button type="button" onClick={() => setDocuments((current) => current.filter((item) => item.localId !== document.localId))} className="inline-flex h-11 items-center justify-center gap-2 self-end border border-transparent text-sm font-bold text-red-700 outline-none hover:border-red-200 hover:bg-red-50 focus:ring-2 focus:ring-red-300"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>
                  </div>
                </fieldset>
              )) : (
                <div className="grid min-h-36 place-items-center border border-dashed border-ink/25 bg-smoke/25 px-5 text-center"><div><FilePlus2 className="mx-auto h-7 w-7 text-ink/30" aria-hidden="true" /><p className="mt-2 text-sm font-bold text-ink/65">No supporting documents yet</p></div></div>
              )}
            </div>
          </section>

          <div className="sticky bottom-3 z-10 flex justify-end border border-ink/20 border-l-4 border-l-signal bg-white/95 p-3 shadow-[0_12px_30px_rgba(9,9,9,0.10)] backdrop-blur">
            <button type="button" onClick={() => void saveTrustPack()} disabled={isSaving || (profile.inspectionStatus === "VERIFIED" && !verificationReady)} aria-describedby="trust-verification-requirements" className="inline-flex h-12 items-center gap-2 bg-ink px-5 text-sm font-black uppercase tracking-wide text-white outline-none hover:bg-signal focus:ring-2 focus:ring-signal/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {isSaving
                ? "Saving trust pack..."
                : profile.inspectionStatus === "VERIFIED" && !verificationReady
                  ? "Complete evidence to verify"
                  : "Save trust pack"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid min-h-64 place-items-center border border-dashed border-ink/25 bg-smoke/25 px-5 text-center">
          <div><CarFront className="mx-auto h-8 w-8 text-ink/30" aria-hidden="true" /><h4 className="mt-3 font-display text-lg font-black uppercase tracking-wide text-ink">Choose a vehicle</h4><p className="mt-1 text-sm text-ink/60">Select inventory above to review or create its trust pack.</p></div>
        </div>
      )}
    </div>
  );
}

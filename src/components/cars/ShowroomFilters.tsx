"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { titleCaseEnum } from "@/lib/format";

const fuels = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
const transmissions = ["AUTOMATIC", "MANUAL"] as const;
const currentYear = new Date().getFullYear();

type ActiveFilter = {
  key: "search" | "brand" | "fuel" | "transmission" | "maxPrice" | "minYear";
  label: string;
};

const controlClassName =
  "mt-2 h-12 w-full rounded-md border border-ink/15 bg-smoke px-3 text-sm text-ink outline-none transition placeholder:text-ink/50 hover:border-ink/30 focus-visible:border-racing focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-racing/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export function ShowroomFilters({
  brands,
  resultCount
}: {
  brands: string[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const searchParam = params.get("search") ?? "";

  const activeFilters: ActiveFilter[] = [];

  if (searchParam) {
    activeFilters.push({ key: "search", label: `Search: “${searchParam}”` });
  }

  const brand = params.get("brand");
  if (brand) {
    activeFilters.push({ key: "brand", label: `Brand: ${brand}` });
  }

  const fuel = params.get("fuel");
  if (fuel) {
    activeFilters.push({ key: "fuel", label: `Fuel: ${titleCaseEnum(fuel)}` });
  }

  const transmission = params.get("transmission");
  if (transmission) {
    activeFilters.push({
      key: "transmission",
      label: `Transmission: ${titleCaseEnum(transmission)}`
    });
  }

  const maxPrice = params.get("maxPrice");
  if (maxPrice) {
    const numericPrice = Number(maxPrice);
    activeFilters.push({
      key: "maxPrice",
      label: `Up to RM ${Number.isFinite(numericPrice) ? numericPrice.toLocaleString("en-MY") : maxPrice}`
    });
  }

  const minYear = params.get("minYear");
  if (minYear) {
    activeFilters.push({ key: "minYear", label: `Year: ${minYear} or newer` });
  }

  function navigate(next: URLSearchParams) {
    const queryString = next.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function update(formData: FormData) {
    const next = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const stringValue = String(value).trim();
      if (stringValue && !(key === "sort" && stringValue === "newest")) {
        next.set(key, stringValue);
      }
    }

    navigate(next);
  }

  function removeFilter(key: ActiveFilter["key"]) {
    const next = new URLSearchParams(params.toString());
    next.delete(key);

    navigate(next);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMobileOpen(false);
    update(new FormData(event.currentTarget));
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Filter vehicle inventory"
      aria-busy={isPending}
      className="rounded-md border border-ink/10 bg-white p-4 shadow-panel sm:p-5 lg:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-copper">
            Refine your search
          </p>
          <p className="mt-1 text-sm leading-6 text-ink/65">
            Use one filter or combine a few to narrow the showroom.
          </p>
        </div>
        <p
          className="inline-flex min-h-9 w-fit items-center rounded-full bg-racing/10 px-3 text-xs font-bold text-racing"
          role="status"
          aria-live="polite"
        >
          {isPending
            ? "Updating inventory…"
            : resultCount === 1
              ? "1 matching vehicle"
              : `${resultCount} matching vehicles`}
        </p>
      </div>

      <button
        type="button"
        aria-expanded={isMobileOpen}
        aria-controls="showroom-filter-fields"
        onClick={() => setIsMobileOpen((current) => !current)}
        className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-ink/15 bg-smoke px-4 text-sm font-black text-ink md:hidden"
      >
        Filter and sort
        <ChevronDown
          className={`h-4 w-4 transition ${isMobileOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        id="showroom-filter-fields"
        className={`${isMobileOpen ? "grid" : "hidden"} mt-5 gap-4 md:grid md:grid-cols-2 xl:grid-cols-4`}
      >
        <label className="block md:col-span-2 xl:col-span-2">
          <span className="text-xs font-bold text-ink/75">Search the showroom</span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/55"
              aria-hidden="true"
            />
            <input
              name="search"
              type="search"
              key={searchParam}
              defaultValue={searchParam}
              placeholder="Brand, model, engine, or keyword"
              autoComplete="off"
              spellCheck={false}
              className={`${controlClassName} pl-11 pr-4`}
            />
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-ink/75">Brand</span>
          <select
            name="brand"
            defaultValue={params.get("brand") ?? ""}
            className={controlClassName}
          >
            <option value="">All brands</option>
            {brands.map((brandOption) => (
              <option key={brandOption} value={brandOption}>
                {brandOption}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-ink/75">Fuel type</span>
          <select
            name="fuel"
            defaultValue={params.get("fuel") ?? ""}
            className={controlClassName}
          >
            <option value="">All fuel types</option>
            {fuels.map((fuelOption) => (
              <option key={fuelOption} value={fuelOption}>
                {titleCaseEnum(fuelOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-ink/75">Transmission</span>
          <select
            name="transmission"
            defaultValue={params.get("transmission") ?? ""}
            className={controlClassName}
          >
            <option value="">All transmissions</option>
            {transmissions.map((transmissionOption) => (
              <option key={transmissionOption} value={transmissionOption}>
                {titleCaseEnum(transmissionOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-ink/75">Maximum price (RM)</span>
          <input
            name="maxPrice"
            type="number"
            min={0}
            step={1000}
            defaultValue={params.get("maxPrice") ?? ""}
            inputMode="numeric"
            placeholder="No maximum"
            className={controlClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-ink/75">Minimum year</span>
          <input
            name="minYear"
            type="number"
            min={1970}
            max={currentYear + 1}
            defaultValue={params.get("minYear") ?? ""}
            inputMode="numeric"
            placeholder="Any year"
            className={controlClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-ink/75">Sort results</span>
          <select
            name="sort"
            defaultValue={params.get("sort") ?? "newest"}
            className={controlClassName}
          >
            <option value="newest">Recently added</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="year-desc">Year: newest first</option>
            <option value="year-asc">Year: oldest first</option>
          </select>
        </label>

        <div className="flex items-end gap-2 md:justify-end xl:col-span-4">
          <Button
            type="submit"
            disabled={isPending}
            className="min-h-12 px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          >
            {isPending ? "Updating…" : "Show results"}
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="mt-5 border-t border-ink/10 pt-4">
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            <span className="mr-1 text-xs font-bold uppercase tracking-[0.16em] text-ink/60">
              Active
            </span>
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => removeFilter(filter.key)}
                disabled={isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-smoke px-3 text-xs font-bold text-ink/75 transition hover:border-ink/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 disabled:opacity-55"
                aria-label={`Remove filter: ${filter.label}`}
              >
                {filter.label}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
            <Link
              href={`${pathname}#inventory`}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-xs font-bold text-ink/65 underline decoration-ink/25 underline-offset-4 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing"
            >
              Clear all filters
            </Link>
          </div>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {isPending ? "Updating vehicle results." : ""}
      </p>
    </form>
  );
}

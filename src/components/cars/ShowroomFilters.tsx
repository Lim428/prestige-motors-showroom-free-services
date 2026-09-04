"use client";

import { FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { titleCaseEnum } from "@/lib/format";

const fuels = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
const transmissions = ["AUTOMATIC", "MANUAL"] as const;
const currentYear = new Date().getFullYear();

type ActiveFilter = {
  key:
    | "search"
    | "brand"
    | "bodyType"
    | "fuel"
    | "transmission"
    | "maxPrice"
    | "maxMileage"
    | "minYear";
  label: string;
};

type FilterValues = {
  search: string;
  brand: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  maxPrice: string;
  maxMileage: string;
  minYear: string;
  sort: string;
};

const emptyValues: FilterValues = {
  search: "",
  brand: "",
  bodyType: "",
  fuel: "",
  transmission: "",
  maxPrice: "",
  maxMileage: "",
  minYear: "",
  sort: "newest"
};

function valuesFromQuery(queryString: string): FilterValues {
  const query = new URLSearchParams(queryString);

  return {
    search: query.get("search") ?? "",
    brand: query.get("brand") ?? "",
    bodyType: query.get("bodyType") ?? "",
    fuel: query.get("fuel") ?? "",
    transmission: query.get("transmission") ?? "",
    maxPrice: query.get("maxPrice") ?? "",
    maxMileage: query.get("maxMileage") ?? "",
    minYear: query.get("minYear") ?? "",
    sort: query.get("sort") ?? "newest"
  };
}

const compactControlClass =
  "mt-1 h-7 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-medium text-ink outline-none placeholder:text-ink/60 focus-visible:outline-none";

const dockFieldClass =
  "block min-w-0 border-b border-ink/20 bg-white px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-racing md:border-b-0 md:border-r";

export function ShowroomFilters(props: {
  brands: string[];
  bodyTypes: string[];
  resultCount: number;
}) {
  const paramsKey = useSearchParams().toString();

  return <ShowroomFilterForm key={paramsKey} {...props} paramsKey={paramsKey} />;
}

function ShowroomFilterForm({
  brands,
  bodyTypes,
  resultCount,
  paramsKey
}: {
  brands: string[];
  bodyTypes: string[];
  resultCount: number;
  paramsKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = new URLSearchParams(paramsKey);
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(() => {
    const initial = valuesFromQuery(paramsKey);
    return Boolean(
      initial.fuel || initial.transmission || (initial.sort && initial.sort !== "newest")
    );
  });
  const [values, setValues] = useState<FilterValues>(() => valuesFromQuery(paramsKey));

  const activeFilters: ActiveFilter[] = [];

  if (params.get("search")) {
    activeFilters.push({ key: "search", label: `Search: “${params.get("search")}”` });
  }

  if (params.get("brand")) {
    activeFilters.push({ key: "brand", label: `Brand: ${params.get("brand")}` });
  }

  if (params.get("bodyType")) {
    activeFilters.push({ key: "bodyType", label: `Body: ${params.get("bodyType")}` });
  }

  if (params.get("fuel")) {
    activeFilters.push({ key: "fuel", label: `Fuel: ${titleCaseEnum(params.get("fuel")!)}` });
  }

  if (params.get("transmission")) {
    activeFilters.push({
      key: "transmission",
      label: `Transmission: ${titleCaseEnum(params.get("transmission")!)}`
    });
  }

  if (params.get("maxPrice")) {
    const maxPrice = params.get("maxPrice")!;
    const numericPrice = Number(maxPrice);
    activeFilters.push({
      key: "maxPrice",
      label: `Up to RM ${Number.isFinite(numericPrice) ? numericPrice.toLocaleString("en-MY") : maxPrice}`
    });
  }

  if (params.get("maxMileage")) {
    const maxMileage = params.get("maxMileage")!;
    const numericMileage = Number(maxMileage);
    activeFilters.push({
      key: "maxMileage",
      label: `Up to ${Number.isFinite(numericMileage) ? numericMileage.toLocaleString("en-MY") : maxMileage} km`
    });
  }

  if (params.get("minYear")) {
    activeFilters.push({
      key: "minYear",
      label: `Year: ${params.get("minYear")} or newer`
    });
  }

  function setValue(key: keyof FilterValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
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
    setValue(key, "");
    const next = new URLSearchParams(paramsKey);
    next.delete(key);
    navigate(next);
  }

  function resetFilters() {
    setValues(emptyValues);
    setIsAdvancedOpen(false);
    navigate(new URLSearchParams());
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
      className="border border-ink/40 bg-white"
    >
      <div className="flex items-center justify-between border-b border-ink/20 px-4 py-3 md:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-racing">
            Find your next car
          </p>
          <p className="mt-1 text-xs font-semibold text-ink/60">
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
          className="inline-flex min-h-11 items-center gap-2 border border-ink/25 px-3 text-xs font-black uppercase tracking-[0.08em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing"
        >
          Filter
          <ChevronDown
            className={`h-4 w-4 transition ${isMobileOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id="showroom-filter-fields"
        className={`${isMobileOpen ? "grid" : "hidden"} md:grid md:grid-cols-3 xl:grid-cols-[minmax(270px,2fr)_repeat(5,minmax(108px,1fr))_auto]`}
      >
        <label className={`${dockFieldClass} md:col-span-2 xl:col-span-1`}>
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
            Search
          </span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/60"
              aria-hidden="true"
            />
            <input
              name="search"
              type="search"
              value={values.search}
              onChange={(event) => setValue("search", event.target.value)}
              placeholder="Make, model or keyword"
              autoComplete="off"
              spellCheck={false}
              className={`${compactControlClass} pl-7`}
            />
          </span>
        </label>

        <label className={dockFieldClass}>
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
            Make
          </span>
          <select
            name="brand"
            value={values.brand}
            onChange={(event) => setValue("brand", event.target.value)}
            className={compactControlClass}
          >
            <option value="">Any make</option>
            {brands.map((brandOption) => (
              <option key={brandOption} value={brandOption}>
                {brandOption}
              </option>
            ))}
          </select>
        </label>

        <label className={dockFieldClass}>
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
            Body
          </span>
          <select
            name="bodyType"
            value={values.bodyType}
            onChange={(event) => setValue("bodyType", event.target.value)}
            className={compactControlClass}
          >
            <option value="">Any body</option>
            {bodyTypes.map((bodyTypeOption) => (
              <option key={bodyTypeOption} value={bodyTypeOption}>
                {bodyTypeOption}
              </option>
            ))}
          </select>
        </label>

        <label className={dockFieldClass}>
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
            Price (RM)
          </span>
          <input
            name="maxPrice"
            type="number"
            min={0}
            step={1000}
            value={values.maxPrice}
            onChange={(event) => setValue("maxPrice", event.target.value)}
            inputMode="numeric"
            placeholder="No max"
            className={compactControlClass}
          />
        </label>

        <label className={dockFieldClass}>
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
            Year
          </span>
          <input
            name="minYear"
            type="number"
            min={1970}
            max={currentYear + 1}
            value={values.minYear}
            onChange={(event) => setValue("minYear", event.target.value)}
            inputMode="numeric"
            placeholder="Any year"
            className={compactControlClass}
          />
        </label>

        <label className={dockFieldClass}>
          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
            Mileage (km)
          </span>
          <input
            name="maxMileage"
            type="number"
            min={0}
            max={2_000_000}
            step={5_000}
            value={values.maxMileage}
            onChange={(event) => setValue("maxMileage", event.target.value)}
            inputMode="numeric"
            placeholder="Any mileage"
            className={compactControlClass}
          />
        </label>

        <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_42px] md:col-span-3 xl:col-span-1">
          <button
            type="submit"
            disabled={isPending}
            className="bg-racing px-4 text-xs font-black uppercase tracking-[0.07em] text-white transition hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-wait disabled:opacity-65"
          >
            {isPending
              ? "Updating…"
              : resultCount === 1
                ? "View 1 car"
                : `View ${resultCount} cars`}
          </button>
          <button
            type="button"
            aria-label="Show fuel, transmission and sorting filters"
            aria-expanded={isAdvancedOpen}
            aria-controls="showroom-advanced-filters"
            onClick={() => setIsAdvancedOpen((current) => !current)}
            className="grid place-items-center bg-ink text-white transition hover:bg-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            title="More filters"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        id="showroom-advanced-filters"
        className={`${isAdvancedOpen ? `${isMobileOpen ? "grid" : "hidden"} md:grid` : "hidden"} border-t border-ink/20 sm:grid-cols-3`}
      >
          <label className={dockFieldClass}>
            <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
              Fuel type
            </span>
            <select
              name="fuel"
              value={values.fuel}
              onChange={(event) => setValue("fuel", event.target.value)}
              className={compactControlClass}
            >
              <option value="">Any fuel</option>
              {fuels.map((fuelOption) => (
                <option key={fuelOption} value={fuelOption}>
                  {titleCaseEnum(fuelOption)}
                </option>
              ))}
            </select>
          </label>

          <label className={dockFieldClass}>
            <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
              Transmission
            </span>
            <select
              name="transmission"
              value={values.transmission}
              onChange={(event) => setValue("transmission", event.target.value)}
              className={compactControlClass}
            >
              <option value="">Any transmission</option>
              {transmissions.map((transmissionOption) => (
                <option key={transmissionOption} value={transmissionOption}>
                  {titleCaseEnum(transmissionOption)}
                </option>
              ))}
            </select>
          </label>

          <label className={`${dockFieldClass} sm:border-r-0`}>
            <span className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/70">
              Sort results
            </span>
            <select
              name="sort"
              value={values.sort}
              onChange={(event) => setValue("sort", event.target.value)}
              className={compactControlClass}
            >
              <option value="newest">Recently added</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="year-desc">Year: newest first</option>
              <option value="year-asc">Year: oldest first</option>
            </select>
          </label>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink/20 bg-smoke/60 px-4 py-3" aria-label="Active filters">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.15em] text-ink/60">
            Active
          </span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => removeFilter(filter.key)}
              disabled={isPending}
              className="inline-flex min-h-9 items-center gap-2 border border-ink/20 bg-white px-3 text-xs font-bold text-ink/70 transition hover:border-racing hover:text-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing disabled:opacity-55"
              aria-label={`Remove filter: ${filter.label}`}
            >
              {filter.label}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            disabled={isPending}
            className="inline-flex min-h-9 items-center px-2 text-xs font-black uppercase tracking-[0.06em] text-ink/60 underline decoration-ink/25 underline-offset-4 transition hover:text-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing disabled:opacity-55"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {isPending ? "Updating vehicle results." : ""}
      </p>
    </form>
  );
}

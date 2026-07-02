"use client";

import { FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { titleCaseEnum } from "@/lib/format";

const fuels = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
const transmissions = ["AUTOMATIC", "MANUAL"] as const;

export function ShowroomFilters({ brands }: { brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");

  function update(formData: FormData) {
    const next = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const stringValue = String(value).trim();
      if (stringValue) {
        next.set(key, stringValue);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update(new FormData(event.currentTarget));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-ink/10 bg-white p-3 shadow-panel sm:p-4"
    >
      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <span className="sr-only">Search cars</span>
          <input
            name="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search brand, model, engine"
            className="h-12 w-full rounded-md border border-ink/10 bg-smoke pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white"
          />
        </label>

        <select
          name="brand"
          defaultValue={params.get("brand") ?? ""}
          className="h-12 rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition focus:border-ink/30 focus:bg-white"
        >
          <option value="">Brand</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        <select
          name="fuel"
          defaultValue={params.get("fuel") ?? ""}
          className="h-12 rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition focus:border-ink/30 focus:bg-white"
        >
          <option value="">Fuel</option>
          {fuels.map((fuel) => (
            <option key={fuel} value={fuel}>
              {titleCaseEnum(fuel)}
            </option>
          ))}
        </select>

        <select
          name="transmission"
          defaultValue={params.get("transmission") ?? ""}
          className="h-12 rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition focus:border-ink/30 focus:bg-white"
        >
          <option value="">Transmission</option>
          {transmissions.map((transmission) => (
            <option key={transmission} value={transmission}>
              {titleCaseEnum(transmission)}
            </option>
          ))}
        </select>

        <label>
          <span className="sr-only">Maximum price</span>
          <input
            name="maxPrice"
            defaultValue={params.get("maxPrice") ?? ""}
            inputMode="numeric"
            placeholder="Max price"
            className="h-12 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white"
          />
        </label>

        <label>
          <span className="sr-only">Minimum year</span>
          <input
            name="minYear"
            defaultValue={params.get("minYear") ?? ""}
            inputMode="numeric"
            placeholder="From year"
            className="h-12 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-ink/30 focus:bg-white"
          />
        </label>

        <div className="flex gap-2">
          <select
            name="sort"
            defaultValue={params.get("sort") ?? "newest"}
            className="h-12 min-w-40 rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none transition focus:border-ink/30 focus:bg-white"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price low</option>
            <option value="price-desc">Price high</option>
            <option value="year-desc">Year new</option>
            <option value="year-asc">Year old</option>
          </select>
          <Button
            type="submit"
            disabled={isPending}
            icon={<SlidersHorizontal className="h-4 w-4" />}
          >
            Filter
          </Button>
        </div>
      </div>

      {params.size > 0 ? (
        <div className="mt-3 flex justify-end">
          <ButtonLink href="/" variant="ghost" icon={<X className="h-4 w-4" />}>
            Clear filters
          </ButtonLink>
        </div>
      ) : null}
    </form>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, GitCompareArrows, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { SerializedCar } from "@/lib/cars";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { trackGrowthEvent } from "@/lib/growth-client";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import {
  readShortlist,
  removeFromShortlist,
  replaceShortlist,
  saveToShortlist,
  SHORTLIST_LIMIT,
  type ShortlistCar,
  subscribeToShortlist,
  toShortlistCar
} from "@/lib/shortlist";

const emptyInitialIds: string[] = [];

export function ComparePageClient({
  initialIds = emptyInitialIds
}: {
  initialIds?: string[];
}) {
  const [selectedCars, setSelectedCars] = useState<ShortlistCar[]>([]);
  const [allCars, setAllCars] = useState<SerializedCar[]>([]);
  const [carToAdd, setCarToAdd] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const update = () => setSelectedCars(readShortlist());
    update();
    return subscribeToShortlist(update);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/cars?sort=newest", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Inventory could not be loaded.");
        }

        return (await response.json()) as { data?: SerializedCar[] };
      })
      .then((result) => {
        const cars = result.data ?? [];
        setAllCars(cars);

        const requested = initialIds.length > 0
          ? cars.filter((car) => initialIds.includes(car.id) || initialIds.includes(car.slug))
          : cars.filter((car) => readShortlist().some((saved) => saved.id === car.id));

        if (requested.length > 0) {
          replaceShortlist(requested.slice(0, SHORTLIST_LIMIT).map(toShortlistCar));
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }

        setMessage("Live inventory could not be refreshed. Your saved comparison is still available.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [initialIds]);

  function addCar() {
    setMessage("");
    const car = allCars.find((item) => item.id === carToAdd);

    if (!car) {
      return;
    }

    const result = saveToShortlist(toShortlistCar(car));

    if (!result.added && result.reason === "limit") {
      setMessage(`Compare up to ${SHORTLIST_LIMIT} vehicles at a time. Remove one first.`);
      return;
    }

    setCarToAdd("");
    trackGrowthEvent("COMPARE_USED", {
      carId: car.id,
      metadata: { shortlistSize: result.cars.length }
    });
  }

  function removeCar(carId: string) {
    removeFromShortlist(carId);
    setMessage("Vehicle removed from comparison.");
  }

  const availableToAdd = allCars.filter(
    (car) => !selectedCars.some((selected) => selected.id === car.id)
  );

  const specificationRows: Array<{
    label: string;
    value: (car: ShortlistCar) => string;
  }> = [
    { label: "Price", value: (car) => car.formattedPrice },
    { label: "Year", value: (car) => String(car.year) },
    { label: "Mileage", value: (car) => formatMileage(car.mileage) },
    { label: "Fuel", value: (car) => titleCaseEnum(car.fuelType) },
    { label: "Transmission", value: (car) => titleCaseEnum(car.transmission) },
    { label: "Engine", value: (car) => car.engine },
    { label: "Condition", value: (car) => car.condition },
    { label: "Availability", value: (car) => titleCaseEnum(car.status) }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <Link
        href="/#inventory"
        className="inline-flex items-center gap-2 text-sm font-black text-ink/60 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to inventory
      </Link>

      <header className="mt-6 max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-copper">
          <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          Your shortlist
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
          Compare what matters
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/60 sm:text-lg">
          Put pricing, mileage, specifications, and equipment side by side. Your shortlist stays
          privately in this browser.
        </p>
      </header>

      <section aria-labelledby="add-vehicle-heading" className="mt-8 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="add-vehicle-heading" className="text-sm font-black text-ink">Add a vehicle</h2>
            <p className="mt-1 text-xs leading-5 text-ink/50">Choose up to {SHORTLIST_LIMIT} showroom vehicles.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:w-[34rem]">
            <select
              value={carToAdd}
              onChange={(event) => setCarToAdd(event.target.value)}
              disabled={isLoading || selectedCars.length >= SHORTLIST_LIMIT}
              aria-label="Vehicle to add"
              className="h-12 min-w-0 flex-1 rounded-xl border border-ink/10 bg-smoke px-4 text-sm font-semibold text-ink outline-none focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-racing/20 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <option value="">
                {isLoading ? "Loading inventory..." : selectedCars.length >= SHORTLIST_LIMIT ? "Comparison is full" : "Select a vehicle"}
              </option>
              {availableToAdd.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.year} {car.brand} {car.model} — {car.formattedPrice}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCar}
              disabled={!carToAdd || selectedCars.length >= SHORTLIST_LIMIT}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-black text-white transition hover:bg-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add to compare
            </button>
          </div>
        </div>
        {message ? <p role="status" aria-live="polite" className="mt-3 text-xs font-semibold text-copper">{message}</p> : null}
      </section>

      {selectedCars.length === 0 ? (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-ink/15 bg-white px-5 py-14 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-smoke text-copper">
            <GitCompareArrows className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-black text-ink">Start your shortlist</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/55">
            Add a vehicle above or save cars while browsing the showroom, then return here for a
            clear side-by-side view.
          </p>
          <Link href="/#inventory" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-racing px-5 text-sm font-black text-white transition hover:bg-racing/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2">
            Browse inventory
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section aria-label="Vehicle comparison" className="mt-8 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">Comparison of saved showroom vehicles</caption>
              <thead>
                <tr className="align-top">
                  <th scope="col" className="w-36 border-b border-r border-ink/10 bg-smoke p-4 text-xs font-black uppercase tracking-[0.16em] text-ink/45">
                    Vehicle
                  </th>
                  {selectedCars.map((car) => (
                    <th key={car.id} scope="col" className="min-w-[245px] border-b border-r border-ink/10 p-4 last:border-r-0">
                      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-smoke">
                        {car.imageUrl ? (
                          <Image
                            src={runtimeImageUrl(car.imageUrl)}
                            alt={car.imageAlt}
                            fill
                            unoptimized={isRuntimeImage(car.imageUrl)}
                            sizes="260px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-xs text-ink/40">Photo coming soon</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCar(car.id)}
                          aria-label={`Remove ${car.year} ${car.brand} ${car.model} from comparison`}
                          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg bg-white/95 text-ink shadow-soft transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.15em] text-copper">{car.year} · {car.brand}</p>
                      <h2 className="mt-1 text-lg font-black text-ink">{car.model}</h2>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specificationRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="border-b border-r border-ink/10 bg-smoke p-4 text-xs font-black uppercase tracking-[0.14em] text-ink/45">
                      {row.label}
                    </th>
                    {selectedCars.map((car) => (
                      <td key={car.id} className="border-b border-r border-ink/10 p-4 text-sm font-bold text-ink/75 last:border-r-0">
                        {row.value(car)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="align-top">
                  <th scope="row" className="border-r border-ink/10 bg-smoke p-4 text-xs font-black uppercase tracking-[0.14em] text-ink/45">
                    Highlights
                  </th>
                  {selectedCars.map((car) => (
                    <td key={car.id} className="border-r border-ink/10 p-4 last:border-r-0">
                      {(car.features ?? []).length > 0 ? (
                        <ul className="space-y-2">
                          {(car.features ?? []).slice(0, 5).map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-xs font-semibold leading-5 text-ink/65">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-racing" aria-hidden="true" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-ink/40">Ask the showroom for equipment details.</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th className="border-r border-t border-ink/10 bg-smoke p-4" />
                  {selectedCars.map((car) => (
                    <td key={car.id} className="border-r border-t border-ink/10 p-4 last:border-r-0">
                      <div className="grid gap-2">
                        <Link href={`/cars/${car.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-xs font-black text-white transition hover:bg-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2">
                          View vehicle
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        {car.status !== "SOLD" ? (
                          <Link href={`/book-test-drive?carId=${encodeURIComponent(car.id)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-ink/15 bg-smoke px-4 text-xs font-black text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2">
                            Book test drive
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="border-t border-ink/10 bg-smoke px-4 py-3 text-center text-xs leading-5 text-ink/45">
            Swipe horizontally on smaller screens. Confirm specifications and availability with the showroom before purchase.
          </p>
        </section>
      )}
    </main>
  );
}

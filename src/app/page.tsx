import type { Metadata } from "next";
import { CarCard } from "@/components/cars/CarCard";
import { EmptyInventory } from "@/components/cars/EmptyInventory";
import { ShowroomFilters } from "@/components/cars/ShowroomFilters";
import { getCars, getFilterOptions } from "@/lib/cars";
import { formatPrice, number } from "@/lib/format";
import { siteUrl } from "@/lib/utils";
import { carQuerySchema } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Premium Used Car Showroom",
  description:
    "Search inspected second-hand vehicles by brand, price, year, fuel type, and transmission."
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function cleanSearchParams(searchParams: SearchParams) {
  const values: Record<string, string> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    const firstValue = Array.isArray(value) ? value[0] : value;

    if (firstValue) {
      values[key] = firstValue;
    }
  }

  return values;
}

export default async function Home({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const parsed = carQuerySchema.safeParse(cleanSearchParams(resolvedSearchParams));
  const query = parsed.success ? parsed.data : carQuerySchema.parse({});
  const [cars, options] = await Promise.all([getCars(query), getFilterOptions()]);
  const availableCount = cars.filter((car) => car.status === "AVAILABLE").length;
  const totalValue = cars.reduce((sum, car) => sum + car.price, 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: "Prestige Motors",
    url: siteUrl(),
    telephone: process.env.DEALER_PHONE ?? "+15551234567",
    makesOffer: cars.slice(0, 12).map((car) => ({
      "@type": "Offer",
      priceCurrency: "USD",
      price: car.price,
      itemOffered: {
        "@type": "Car",
        name: `${car.year} ${car.brand} ${car.model}`,
        vehicleModelDate: car.year,
        mileageFromOdometer: {
          "@type": "QuantitativeValue",
          value: car.mileage,
          unitCode: "SMI"
        }
      },
      availability:
        car.status === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
    }))
  };

  return (
    <main>
      <section className="border-b border-ink/10 bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-16">
          <div className="animate-fade-up">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-champagne">
              Second-hand car showroom
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-normal sm:text-6xl">
              Premium pre-owned cars, inspected and ready for their next owner.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">
              Browse curated vehicles with transparent specifications, rich imagery, and
              direct dealer contact from the vehicle page.
            </p>
          </div>

          <div className="grid content-end gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-md border border-white/10 bg-white/8 p-5">
              <p className="text-3xl font-black">{number.format(cars.length)}</p>
              <p className="mt-1 text-sm text-white/60">Vehicles listed</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/8 p-5">
              <p className="text-3xl font-black">{number.format(availableCount)}</p>
              <p className="mt-1 text-sm text-white/60">Available now</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/8 p-5">
              <p className="text-3xl font-black">{formatPrice(totalValue)}</p>
              <p className="mt-1 text-sm text-white/60">Inventory value</p>
            </div>
          </div>
        </div>
      </section>

      <section id="inventory" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ShowroomFilters brands={options.brands} />

        <div className="mt-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-copper">
              Current inventory
            </p>
            <h2 className="mt-2 text-3xl font-black text-ink">Showroom</h2>
          </div>
          <p className="text-sm text-ink/55">
            {cars.length === 1 ? "1 vehicle" : `${cars.length} vehicles`} found
          </p>
        </div>

        {cars.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car, index) => (
              <CarCard key={car.id} car={car} priority={index < 3} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyInventory />
          </div>
        )}
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { CarCard } from "@/components/cars/CarCard";
import { EmptyInventory } from "@/components/cars/EmptyInventory";
import { ShowroomFilters } from "@/components/cars/ShowroomFilters";
import { getCars, getFilterOptions } from "@/lib/cars";
import { formatPrice, number } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
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
  const heroCar = cars.find((car) => car.images[0]) ?? cars[0];
  const heroImage = heroCar?.images[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: "Prestige Motors",
    url: siteUrl(),
    telephone: process.env.DEALER_PHONE ?? "+15551234567",
    makesOffer: cars.slice(0, 12).map((car) => ({
      "@type": "Offer",
      priceCurrency: "MYR",
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
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {heroImage ? (
          <Image
            src={runtimeImageUrl(heroImage.url)}
            alt={heroImage.altText}
            fill
            priority
            unoptimized={isRuntimeImage(heroImage.url)}
            sizes="100vw"
            className="object-cover opacity-55"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,0.92),rgba(17,17,17,0.68)_42%,rgba(17,17,17,0.34)),linear-gradient(0deg,rgba(17,17,17,0.78),transparent_58%)]" />

        <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col justify-end px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-4xl animate-fade-up">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-champagne">
              Premium used car showroom
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-normal sm:text-6xl">
              Curated pre-owned cars, inspected and ready for serious buyers.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
              Search live stock, compare clear specifications, ask the AI buyer assistant,
              and contact the dealer directly from each vehicle page.
            </p>
          </div>

          <div className="mt-9 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              ["Vehicles listed", number.format(cars.length)],
              ["Available now", number.format(availableCount)],
              ["Inventory value", formatPrice(totalValue)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-sm text-white/64">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="inventory" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ShowroomFilters brands={options.brands} />

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {[
            ["Inspected stock", "Clear specs, status, mileage, and condition on every listing."],
            ["Fast dealer contact", "Call, WhatsApp, or send an enquiry from the car page."],
            ["AI shortlisting", "Ask for budget, fuel, family, or daily-driver recommendations."]
          ].map(([title, copy]) => (
            <div key={title} className="rounded-md border border-ink/10 bg-white px-5 py-4 shadow-sm">
              <p className="font-black text-ink">{title}</p>
              <p className="mt-1 text-sm leading-6 text-ink/58">{copy}</p>
            </div>
          ))}
        </div>

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

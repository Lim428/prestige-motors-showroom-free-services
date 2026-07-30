import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, MessageCircle } from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import { EmptyInventory } from "@/components/cars/EmptyInventory";
import { ShowroomFilters } from "@/components/cars/ShowroomFilters";
import { getCars, getFilterOptions } from "@/lib/cars";
import { number } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { dealerName, dealerPhone, dealerWhatsApp, siteUrl } from "@/lib/utils";
import { carQuerySchema } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Premium Used Car Showroom",
  description:
    "Search inspected second-hand vehicles by brand, price, year, fuel type, and transmission."
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const defaultQuery = carQuerySchema.parse({});
  const [cars, options, showroomCars] = await Promise.all([
    getCars(query),
    getFilterOptions(),
    getCars(defaultQuery)
  ]);
  const availableCount = showroomCars.filter((car) => car.status === "AVAILABLE").length;
  const heroCar =
    showroomCars.find((car) => car.status === "AVAILABLE" && car.images[0]) ??
    showroomCars.find((car) => car.images[0]) ??
    showroomCars[0];
  const heroImage = heroCar?.images[0];
  const whatsAppMessage = encodeURIComponent(
    "Hi, I would like help choosing a vehicle from the Prestige Motors showroom."
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: dealerName(),
    url: siteUrl(),
    telephone: dealerPhone(),
    makesOffer: showroomCars.slice(0, 12).map((car) => ({
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
          unitCode: "KMT"
        }
      },
      availability:
        car.status === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
    }))
  };

  return (
    <main>
      <section
        aria-labelledby="showroom-heading"
        className="relative isolate overflow-hidden bg-ink text-white"
      >
        {heroImage ? (
          <Image
            src={runtimeImageUrl(heroImage.url)}
            alt=""
            fill
            priority
            unoptimized={isRuntimeImage(heroImage.url)}
            sizes="100vw"
            className="object-cover object-center opacity-50"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,0.97)_0%,rgba(17,17,17,0.86)_48%,rgba(17,17,17,0.3)_100%),linear-gradient(0deg,rgba(17,17,17,0.8),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center px-4 py-14 sm:min-h-[560px] sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl motion-safe:animate-fade-up">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-champagne sm:text-sm">
              <span className="h-px w-8 bg-champagne" aria-hidden="true" />
              Prestige Motors showroom
            </p>
            <h1
              id="showroom-heading"
              className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-7xl"
            >
              Find the right car.
              <span className="block text-champagne">Choose with clarity.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              Explore live pre-owned stock with clear pricing, useful specifications, and a
              direct line to the showroom when you are ready to talk.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#inventory"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-champagne px-6 py-3 text-sm font-black text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Explore available cars
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={`https://wa.me/${dealerWhatsApp()}?text=${whatsAppMessage}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ask the showroom
              </a>
            </div>

            {heroCar ? (
              <Link
                href={`/cars/${heroCar.slug}`}
                className="mt-8 inline-flex max-w-full items-center gap-3 border-l-2 border-champagne pl-4 text-left transition hover:border-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={`View featured vehicle: ${heroCar.year} ${heroCar.brand} ${heroCar.model}`}
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">
                    Featured in the showroom
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold text-white sm:text-base">
                    {heroCar.year} {heroCar.brand} {heroCar.model}
                    <span className="ml-2 text-champagne">{heroCar.formattedPrice}</span>
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-champagne" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>

        <div id="experience" className="relative border-t border-white/15 bg-ink/80 backdrop-blur">
          <div className="mx-auto grid max-w-7xl divide-y divide-white/10 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
            {[
              [
                `${number.format(availableCount)} available now`,
                "A live view of vehicles ready for buyer enquiries."
              ],
              ["Clear listing details", "Price, condition, mileage, and key features together."],
              ["Direct showroom access", "Call, WhatsApp, or enquire from each vehicle page."]
            ].map(([title, copy]) => (
              <div key={title} className="flex gap-3 py-4 sm:px-5 sm:py-5 first:sm:pl-0 last:sm:pr-0">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-champagne"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-black text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="inventory"
        aria-labelledby="inventory-heading"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-copper">
              Live inventory
            </p>
            <h2
              id="inventory-heading"
              className="mt-3 text-3xl font-black tracking-[-0.025em] text-ink sm:text-4xl"
            >
              Cars worth a closer look
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70 sm:text-base">
              Search the showroom, refine what matters, and open any vehicle for full details
              and direct dealer contact.
            </p>
          </div>
          <p
            className="shrink-0 text-sm font-bold text-ink/70"
            role="status"
            aria-live="polite"
          >
            {cars.length === 1 ? "1 vehicle found" : `${cars.length} vehicles found`}
          </p>
        </div>

        <div className="mt-8">
          <ShowroomFilters brands={options.brands} resultCount={cars.length} />
        </div>

        {cars.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

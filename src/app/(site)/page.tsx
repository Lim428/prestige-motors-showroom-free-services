import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  GitCompareArrows,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { TrackedContactLink } from "@/components/analytics/TrackedContactLink";
import { CarCard } from "@/components/cars/CarCard";
import { EmptyInventory } from "@/components/cars/EmptyInventory";
import { ShowroomFilters } from "@/components/cars/ShowroomFilters";
import { StockAlertForm } from "@/components/growth/StockAlertForm";
import { vehicleName } from "@/lib/car-display";
import { getCars, getFilterOptions, getShowroomSummary } from "@/lib/cars";
import { number } from "@/lib/format";
import { serializeJsonLd } from "@/lib/json-ld";
import { dealerEmail, dealerName, dealerPhone, dealerWhatsApp, siteUrl } from "@/lib/utils";
import { carQuerySchema } from "@/lib/validators";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.home");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: siteUrl() }
  };
}

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
  const [cars, options, showroomSummary] = await Promise.all([
    getCars(query),
    getFilterOptions(),
    getShowroomSummary(defaultQuery)
  ]);
  const heroArtwork = "/images/editorial-showroom-hero.jpg";
  const whatsAppMessage = encodeURIComponent(
    "Hi, I would like help choosing a vehicle from the Prestige Motors showroom."
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: dealerName(),
    url: siteUrl(),
    telephone: dealerPhone(),
    email: dealerEmail(),
    makesOffer: showroomSummary.offers.map((car) => ({
      "@type": "Offer",
      priceCurrency: "MYR",
      price: car.price,
      itemOffered: {
        "@type": "Car",
        name: vehicleName(car),
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

  const serviceItems = [
    {
      icon: ShieldCheck,
      title: "Curated selection",
      copy: `${number.format(showroomSummary.availableCount)} cars available now`
    },
    {
      icon: ClipboardCheck,
      title: "Transparent details",
      copy: "Clear specifications & pricing"
    },
    {
      icon: MapPin,
      title: "Showroom in PJ",
      copy: "View & test drive"
    }
  ];

  return (
    <main className="overflow-hidden bg-white">
      <AnalyticsTracker event="PAGE_VIEW" />

      <section
        aria-labelledby="showroom-heading"
        className="relative isolate overflow-hidden bg-ink text-white"
      >
        <Image
          src={heroArtwork}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[68%_center] brightness-75 saturate-75 contrast-110 lg:origin-right lg:scale-110 lg:object-contain lg:object-right"
        />
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
        <div
          className="absolute inset-y-0 left-0 w-[72%] bg-black/80 lg:w-[54%]"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex min-h-[490px] max-w-[1440px] items-center px-5 py-10 sm:min-h-[500px] sm:px-8 lg:min-h-[460px] lg:px-12 lg:py-5">
          <div className="max-w-[760px] motion-safe:animate-fade-up">
            <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/90 sm:text-xs">
              <span className="h-0.5 w-8 bg-racing sm:w-10" aria-hidden="true" />
              Malaysia&apos;s pre-owned car destination
            </p>
            <h1
              id="showroom-heading"
              className="mt-7 font-display text-[clamp(4.3rem,9vw,7.5rem)] font-black uppercase leading-[0.84] tracking-[-0.045em]"
            >
              Drive what
              <span className="block">moves you</span>
            </h1>
            <p className="mt-7 max-w-[580px] text-base leading-7 text-white/80 sm:text-xl sm:leading-8">
              Curated pre-owned cars with clear pricing, verified details, and a showroom team
              ready to help.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="#inventory"
                className="inline-flex min-h-13 items-center justify-center gap-4 bg-racing px-7 py-4 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Browse inventory
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#buyer-tools"
                className="inline-flex min-h-12 items-center gap-3 px-2 text-xs font-black uppercase tracking-[0.09em] text-white transition hover:text-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                How it works
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      <section aria-label="Showroom assurances" className="border-b border-ink/20 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-ink/10 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:divide-x lg:divide-y-0 lg:px-12">
          {serviceItems.map(({ icon: Icon, title, copy }) => (
            <div
              key={title}
              className="flex min-h-16 items-center gap-4 py-3 sm:px-5 first:sm:pl-0"
            >
              <Icon className="h-6 w-6 shrink-0 stroke-[1.7] text-ink" aria-hidden="true" />
              <div>
                <p className="text-xs font-black text-ink">{title}</p>
                <p className="mt-0.5 text-xs text-ink/60">{copy}</p>
              </div>
            </div>
          ))}
          <TrackedContactLink
            channel="whatsapp"
            href={`https://wa.me/${dealerWhatsApp()}?text=${whatsAppMessage}`}
            className="group flex min-h-16 items-center gap-4 py-3 sm:px-5 lg:pr-0"
          >
            <MessageCircle
              className="h-6 w-6 shrink-0 stroke-[1.7] text-ink transition group-hover:text-racing"
              aria-hidden="true"
            />
            <span>
              <span className="block text-xs font-black text-ink">Talk to our team</span>
              <span className="mt-0.5 block text-xs text-ink/60">{dealerWhatsApp()}</span>
            </span>
          </TrackedContactLink>
        </div>
      </section>

      <section aria-label="Search showroom inventory" className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-3 sm:px-8 lg:px-12">
          <ShowroomFilters
            brands={options.brands}
            bodyTypes={options.bodyTypes}
            resultCount={cars.length}
          />
        </div>
      </section>

      <section
        id="inventory"
        aria-labelledby="inventory-heading"
        className="mx-auto grid max-w-[1440px] scroll-mt-24 gap-8 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12 lg:px-12 lg:pb-12 lg:pt-4"
      >
        <div className="lg:pt-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-racing underline decoration-racing underline-offset-4">
            Latest in stock
          </p>
          <h2
            id="inventory-heading"
            className="mt-4 max-w-[180px] font-display text-5xl font-black uppercase leading-[0.88] tracking-[-0.04em] text-ink sm:text-6xl lg:text-[3.25rem]"
          >
            Fresh arrivals
          </h2>
          <ArrowRight className="mt-5 h-6 w-6 text-racing" aria-hidden="true" />
          <p
            className="mt-6 text-xs font-bold uppercase tracking-[0.08em] text-ink/60"
            role="status"
            aria-live="polite"
          >
            {cars.length === 1 ? "1 vehicle found" : `${cars.length} vehicles found`}
          </p>
        </div>

        <div>
          {cars.length > 0 ? (
            <div className="border-t border-ink/20">
              {cars.map((car, index) => (
                <CarCard key={car.id} car={car} priority={index < 3} />
              ))}
            </div>
          ) : (
            <EmptyInventory />
          )}
        </div>
      </section>

      <section id="buyer-tools" className="scroll-mt-24 border-t-4 border-racing bg-ink text-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.86fr)_minmax(480px,1.14fr)] lg:px-12 lg:py-24">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-racing">
              <span className="h-0.5 w-9 bg-racing" aria-hidden="true" />
              Buyer toolkit
            </p>
            <h2 className="mt-5 max-w-2xl font-display text-5xl font-black uppercase leading-[0.9] tracking-[-0.035em] sm:text-7xl">
              Make the next move on your terms.
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
              Save and compare vehicles, reserve showroom time, estimate finance, or request a
              professional appraisal for your current car.
            </p>

            <div className="mt-9 divide-y divide-white/20 border-y border-white/20">
              {[
                {
                  href: "/compare",
                  icon: GitCompareArrows,
                  title: "Compare saved cars",
                  copy: "Review specifications side by side."
                },
                {
                  href: "/book-test-drive",
                  icon: CalendarDays,
                  title: "Book a test drive",
                  copy: "Choose a live showroom time."
                },
                {
                  href: "/trade-in",
                  icon: RefreshCw,
                  title: "Request an appraisal",
                  copy: "Share your vehicle details and photos."
                }
              ].map(({ href, icon: Icon, title, copy }) => (
                <Link
                  key={href}
                  href={href}
                  className="group grid min-h-24 grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing"
                >
                  <Icon className="h-5 w-5 text-racing" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-black uppercase tracking-[0.04em]">
                      {title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/50">{copy}</span>
                  </span>
                  <ArrowUpRight
                    className="h-5 w-5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>

            <p className="mt-7 flex items-start gap-2 text-xs leading-5 text-white/50">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
              Alerts are matched against live inventory and recorded price changes.
            </p>
          </div>

          <div className="[&>form]:!rounded-none [&_button]:!rounded-none [&_input]:!rounded-none [&_label>span]:!rounded-none [&_select]:!rounded-none">
            <StockAlertForm />
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </main>
  );
}

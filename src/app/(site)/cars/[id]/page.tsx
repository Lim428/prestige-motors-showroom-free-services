import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import { CarGallery } from "@/components/cars/CarGallery";
import { EnquiryForm } from "@/components/cars/EnquiryForm";
import { FinanceCalculator } from "@/components/growth/FinanceCalculator";
import { SaveCompareControls } from "@/components/growth/SaveCompareControls";
import { StockAlertForm } from "@/components/growth/StockAlertForm";
import { TrustPack } from "@/components/growth/TrustPack";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { TrackedContactLink } from "@/components/analytics/TrackedContactLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { getCarBySlugOrId, getRelatedCars } from "@/lib/cars";
import { dealerPhone, dealerWhatsApp, siteUrl } from "@/lib/utils";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const primaryContactClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2";

const secondaryContactClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-racing px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-racing/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/35 focus-visible:ring-offset-2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const car = await getCarBySlugOrId(id);

  if (!car) {
    return {
      title: "Vehicle not found"
    };
  }

  const title = `${car.year} ${car.brand} ${car.model}`;
  const image = car.images[0]?.url;

  return {
    title,
    description: car.description,
    openGraph: {
      title,
      description: car.description,
      images: image ? [image] : undefined,
      url: `${siteUrl()}/cars/${car.slug}`
    }
  };
}

export default async function CarDetailPage({ params }: Props) {
  const { id } = await params;
  const car = await getCarBySlugOrId(id);

  if (!car) {
    notFound();
  }

  const related = await getRelatedCars(car);
  const carName = `${car.year} ${car.brand} ${car.model}`;
  const isSold = car.status === "SOLD";
  const isReserved = car.status === "RESERVED";
  const availability = isSold
    ? {
        eyebrow: "Recently sold",
        title: "This vehicle has found its next owner.",
        copy: "Looking for a similar specification? Our team can help source the closest match.",
        phoneLabel: "Browse live stock",
        whatsappLabel: "Find something similar"
      }
    : isReserved
      ? {
          eyebrow: "Reservation in progress",
          title: "A buyer has placed a temporary hold.",
          copy: "Reservations can change. Contact us to confirm its status or join the priority list.",
          phoneLabel: "Check availability",
          whatsappLabel: "Join priority list"
        }
      : {
          eyebrow: "Available now",
          title: "Ready for a private viewing.",
          copy: "Speak directly with the showroom to confirm availability and arrange a closer look.",
          phoneLabel: "Call showroom",
          whatsappLabel: "Arrange on WhatsApp"
        };
  const whatsAppMessage = encodeURIComponent(
    isSold
      ? `Hi, I am looking for a vehicle similar to the ${carName}, listed at ${car.formattedPrice}.`
      : isReserved
        ? `Hi, I would like to check the current availability of the ${carName}, listed at ${car.formattedPrice}.`
        : `Hi, I am interested in viewing the ${carName}, listed at ${car.formattedPrice}.`
  );
  const whatsappUrl = `https://wa.me/${dealerWhatsApp()}?text=${whatsAppMessage}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: carName,
    brand: car.brand,
    model: car.model,
    vehicleModelDate: car.year,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: car.mileage,
      unitCode: "KMT"
    },
    fuelType: titleCaseEnum(car.fuelType),
    vehicleTransmission: titleCaseEnum(car.transmission),
    offers: {
      "@type": "Offer",
      priceCurrency: "MYR",
      price: car.price,
      availability: isSold
        ? "https://schema.org/SoldOut"
        : isReserved
          ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/InStock",
      url: `${siteUrl()}/cars/${car.slug}`
    }
  };

  return (
    <main className="pb-32 sm:pb-16">
      <AnalyticsTracker event="VEHICLE_VIEW" carId={car.id} />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href="/#inventory"
            className="inline-flex shrink-0 items-center gap-2 font-bold text-ink/60 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to inventory
          </Link>
          <span className="text-ink/20" aria-hidden="true">
            /
          </span>
          <span className="truncate text-ink/40" aria-current="page">
            {car.brand} {car.model}
          </span>
        </nav>

        <header className="mt-7 border-b border-ink/10 pb-7 sm:mt-10 sm:pb-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-copper">
                  {car.year} · {car.brand}
                </p>
                <StatusBadge status={car.status} />
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-ink sm:text-5xl lg:text-6xl">
                {car.model}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/55">
                {car.condition} · {formatMileage(car.mileage)} ·{" "}
                {titleCaseEnum(car.transmission)}
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/40">
                Asking price
              </p>
              <p className="mt-2 text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
                {car.formattedPrice}
              </p>
              <p className="mt-2 text-xs text-ink/45">Final availability confirmed by dealer</p>
              <SaveCompareControls car={car} className="mt-4 sm:justify-end" compact />
            </div>
          </div>
        </header>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.65fr)] lg:gap-10">
          <section aria-label={`${carName} photography`}>
            <CarGallery carId={car.id} images={car.images} title={carName} />
          </section>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white shadow-panel">
              <div className="bg-ink p-6 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-champagne">
                  {availability.eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-black leading-tight">{availability.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">{availability.copy}</p>
              </div>

              <div className="p-5 sm:p-6">
                <dl className="grid grid-cols-2 gap-x-5 gap-y-5">
                  {[
                    ["Year", car.year],
                    ["Mileage", formatMileage(car.mileage)],
                    ["Transmission", titleCaseEnum(car.transmission)],
                    ["Fuel type", titleCaseEnum(car.fuelType)],
                    ["Engine", car.engine],
                    ["Condition", car.condition]
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-ink/10 pb-3">
                      <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-ink/35">
                        {label}
                      </dt>
                      <dd className="mt-1.5 text-sm font-bold leading-5 text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {isSold ? (
                    <Link href="/#inventory" className={primaryContactClass}>
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      {availability.phoneLabel}
                    </Link>
                  ) : (
                    <TrackedContactLink
                      carId={car.id}
                      channel="phone"
                      href={`tel:${dealerPhone()}`}
                      className={primaryContactClass}
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {availability.phoneLabel}
                    </TrackedContactLink>
                  )}
                  <TrackedContactLink
                    carId={car.id}
                    channel="whatsapp"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={secondaryContactClass}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {availability.whatsappLabel}
                  </TrackedContactLink>
                </div>

                {!isSold ? (
                  <Link
                    href={`/book-test-drive?carId=${car.id}`}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink/15 bg-smoke px-4 text-sm font-black text-ink transition hover:border-ink/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-2"
                  >
                    <CalendarDays className="h-4 w-4 text-copper" aria-hidden="true" />
                    Book a test drive
                  </Link>
                ) : null}

                <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/45">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-racing" aria-hidden="true" />
                  You will speak directly with the showroom team—no third-party lead centre.
                </p>
              </div>
            </section>

            <EnquiryForm carId={car.id} carName={carName} carStatus={car.status} />
            <StockAlertForm
              carId={car.id}
              initialBrand={car.brand}
              initialModel={car.model}
              initialMaxPrice={car.price}
              compact
            />
          </aside>
        </div>

        <section
          aria-label="Showroom support"
          className="mt-10 grid overflow-hidden rounded-[1.5rem] border border-white/10 bg-ink text-white sm:grid-cols-3"
        >
          {[
            {
              icon: CheckCircle2,
              title: "Dealer-managed listing",
              copy: "Photography, status, and specifications are maintained by the showroom."
            },
            {
              icon: ShieldCheck,
              title: "Clear vehicle details",
              copy: "Key specifications and condition are presented before you make contact."
            },
            {
              icon: Sparkles,
              title: "Personal shortlisting",
              copy: "Ask the buyer concierge to compare this car with current stock."
            }
          ].map(({ icon: Icon, title, copy }, index) => (
            <div
              key={title}
              className={`p-6 ${index > 0 ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}
            >
              <Icon className="h-5 w-5 text-champagne" aria-hidden="true" />
              <h2 className="mt-4 text-base font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">{copy}</p>
            </div>
          ))}
        </section>

        <TrustPack carId={car.id} vehicleName={carName} className="mt-10" />

        <section className="mt-14 grid gap-10 border-y border-ink/10 py-12 lg:grid-cols-[0.6fr_1.4fr] lg:gap-16 lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-copper">
              Vehicle profile
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
              The story behind this car
            </h2>
            <p className="mt-4 text-sm leading-6 text-ink/50">
              Review the essentials, then contact the team for inspection details and current
              availability.
            </p>
          </div>

          <div>
            <p className="whitespace-pre-line text-base leading-8 text-ink/68 sm:text-lg sm:leading-9">
              {car.description}
            </p>

            <div className="mt-9">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-copper" aria-hidden="true" />
                <h3 className="text-lg font-black text-ink">Equipment highlights</h3>
              </div>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {car.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 border-b border-ink/10 py-3 text-sm font-semibold leading-6 text-ink/72"
                  >
                    <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-racing/10 text-racing">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <FinanceCalculator
          price={car.price}
          carId={car.id}
          vehicleName={carName}
          className="mt-14 sm:mt-16"
        />

        <section className="mt-8 flex flex-col gap-5 rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-copper">
              Already own a car?
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">
              Put its value toward your next move.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
              Send the appraisal team your vehicle details and photos for a no-obligation trade-in review.
            </p>
          </div>
          <Link
            href="/trade-in"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-black text-white transition hover:bg-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2"
          >
            Start trade-in appraisal
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        {related.length > 0 ? (
          <section className="mt-14 sm:mt-16">
            <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-copper">
                  Continue exploring
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                  Similar cars, carefully selected
                </h2>
              </div>
              <Link
                href="/#inventory"
                className="inline-flex items-center gap-2 text-sm font-black text-ink transition hover:text-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-2"
              >
                View all inventory
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <CarCard key={item.id} car={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 shadow-[0_-12px_40px_rgba(17,17,17,0.1)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-copper">
              {availability.eyebrow}
            </p>
            <p className="mt-0.5 truncate text-sm font-black text-ink">{car.formattedPrice}</p>
          </div>
          {isSold ? (
            <Link
              href="/#inventory"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-black text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Stock
            </Link>
          ) : (
            <TrackedContactLink
              carId={car.id}
              channel="phone"
              href={`tel:${dealerPhone()}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-black text-white"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call
            </TrackedContactLink>
          )}
          <TrackedContactLink
            carId={car.id}
            channel="whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-racing px-3 text-xs font-black text-white"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {isSold ? "Source" : "WhatsApp"}
          </TrackedContactLink>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}

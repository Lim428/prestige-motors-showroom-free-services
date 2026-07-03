import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import { CarGallery } from "@/components/cars/CarGallery";
import { EnquiryForm } from "@/components/cars/EnquiryForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { getCarBySlugOrId, getRelatedCars } from "@/lib/cars";
import { dealerPhone, dealerWhatsApp, siteUrl } from "@/lib/utils";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

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
  const whatsAppMessage = encodeURIComponent(
    `Hi, I am interested in the ${carName} listed for ${car.formattedPrice}.`
  );
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
      unitCode: "SMI"
    },
    fuelType: titleCaseEnum(car.fuelType),
    vehicleTransmission: titleCaseEnum(car.transmission),
    offers: {
      "@type": "Offer",
      priceCurrency: "MYR",
      price: car.price,
      availability:
        car.status === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: `${siteUrl()}/cars/${car.slug}`
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 grid gap-3 rounded-md border border-ink/10 bg-white px-4 py-4 shadow-sm md:grid-cols-3">
        {[
          ["Verified listing", "Photos, status, and specifications are managed by the dealer."],
          ["Fast response", "Call, WhatsApp, or send a direct enquiry from this page."],
          ["Buyer assistant", "Use the AI assistant to compare this car with current stock."]
        ].map(([title, copy]) => (
          <div key={title} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-racing" aria-hidden="true" />
            <div>
              <p className="font-black text-ink">{title}</p>
              <p className="mt-1 text-sm leading-6 text-ink/58">{copy}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <section>
          <CarGallery images={car.images} title={carName} />
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-ink/10 bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-copper">
                  {car.brand}
                </p>
                <h1 className="mt-2 text-3xl font-black text-ink">{carName}</h1>
              </div>
              <StatusBadge status={car.status} />
            </div>

            <p className="mt-6 text-4xl font-black text-ink">{car.formattedPrice}</p>
            <p className="mt-2 text-sm text-ink/55">{car.condition}</p>

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Year", car.year],
                ["Mileage", formatMileage(car.mileage)],
                ["Transmission", titleCaseEnum(car.transmission)],
                ["Fuel", titleCaseEnum(car.fuelType)],
                ["Engine", car.engine],
                ["Status", titleCaseEnum(car.status)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-smoke p-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={`tel:${dealerPhone()}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-graphite"
              >
                <Phone className="h-4 w-4" />
                Contact dealer
              </a>
              <a
                href={`https://wa.me/${dealerWhatsApp()}?text=${whatsAppMessage}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-racing px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-racing/90"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <EnquiryForm carId={car.id} carName={carName} />
        </aside>
      </div>

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.75fr_1fr]">
        <div className="rounded-md border border-ink/10 bg-white p-6 shadow-panel">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-racing" />
            <h2 className="text-xl font-black text-ink">Vehicle description</h2>
          </div>
          <p className="mt-5 whitespace-pre-line text-sm leading-7 text-ink/68">
            {car.description}
          </p>
        </div>

        <div className="rounded-md border border-ink/10 bg-white p-6 shadow-panel">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-copper" aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">Features</h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {car.features.map((feature) => (
              <li
                key={feature}
                className="rounded-md border border-ink/10 bg-smoke px-4 py-3 text-sm font-medium text-ink/75"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-copper">
                Related vehicles
              </p>
              <h2 className="mt-2 text-3xl font-black text-ink">You may also like</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <CarCard key={item.id} car={item} />
            ))}
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}

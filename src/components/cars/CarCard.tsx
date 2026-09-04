import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SaveCompareControls } from "@/components/growth/SaveCompareControls";
import { vehicleModelLabel, vehicleName } from "@/lib/car-display";
import type { SerializedCar } from "@/lib/cars";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";

const statusStyles = {
  AVAILABLE: "bg-white text-ink",
  RESERVED: "bg-racing text-white",
  SOLD: "bg-ink text-white"
} as const;

export function CarCard({ car, priority = false }: { car: SerializedCar; priority?: boolean }) {
  const image = car.images[0];
  const carName = vehicleName(car);
  const modelLabel = vehicleModelLabel(car.model, car.variant);
  const location = car.showroomLocation || "Prestige Motors showroom";

  return (
    <article className="group grid border-b border-ink/20 bg-white transition-colors hover:bg-smoke/40 lg:grid-cols-[minmax(290px,37%)_minmax(0,1fr)]">
      <Link
        href={`/cars/${car.slug}`}
        aria-label={`View ${carName}`}
        className="relative block aspect-[16/10] overflow-hidden bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing lg:aspect-auto lg:min-h-[105px]"
      >
        {image ? (
          <Image
            src={runtimeImageUrl(image.url)}
            alt={image.altText}
            fill
            unoptimized={isRuntimeImage(image.url)}
            priority={priority}
            sizes="(min-width: 1280px) 34vw, (min-width: 1024px) 38vw, 100vw"
            className="object-cover transition duration-700 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none"
          />
        ) : (
          <div className="grid h-full place-items-center bg-smoke px-6 text-center text-xs font-black uppercase tracking-[0.1em] text-ink/60">
            Photography scheduled
          </div>
        )}
        <span
          className={`absolute left-3 top-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] shadow-sm ${statusStyles[car.status]}`}
        >
          {titleCaseEnum(car.status)}
        </span>
        <span className="absolute bottom-3 left-3 bg-ink/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white">
          {car.condition}
        </span>
      </Link>

      <div className="flex min-w-0 flex-col px-5 py-5 sm:px-6 lg:px-5 lg:py-3">
        <div className="grid flex-1 items-center gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(145px,1.35fr)_minmax(190px,1.05fr)_minmax(105px,0.75fr)_auto_auto] lg:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.11em] text-ink/60">
              {car.year} · {car.brand}
            </p>
            <h3 className="mt-1.5 text-lg font-black uppercase leading-tight tracking-[-0.02em] text-ink sm:text-xl">
              <Link
                href={`/cars/${car.slug}`}
                className="transition hover:text-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing"
              >
                {modelLabel}
              </Link>
            </h3>
            <p className="mt-1.5 text-xs font-medium text-ink/60">
              {titleCaseEnum(car.transmission)} <span aria-hidden="true">·</span>{" "}
              {titleCaseEnum(car.fuelType)}
              {car.drivetrain ? (
                <>
                  {" "}<span aria-hidden="true">·</span> {car.drivetrain}
                </>
              ) : null}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1 lg:gap-3">
            <div>
              <dt className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/50">
                Mileage
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink lg:text-xs">{formatMileage(car.mileage)}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/50">
                Location
              </dt>
              <dd className="mt-1 line-clamp-1 text-sm font-semibold text-ink lg:text-xs">{location}</dd>
            </div>
          </dl>

          <div className="sm:text-right lg:text-left">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/50">
              Drive away price
            </p>
            <Link
              href={`/cars/${car.slug}`}
              className="mt-1 inline-block font-display text-2xl font-black uppercase tracking-[-0.025em] text-racing transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing lg:text-[1.7rem]"
            >
              {car.formattedPrice}
            </Link>
          </div>

          <SaveCompareControls
            car={car}
            compact
            iconOnly
            showCompareLink={false}
            className="hidden shrink-0 lg:flex"
          />

          <Link
            href={`/cars/${car.slug}`}
            aria-label={`Open details for ${carName}`}
            className="hidden h-11 w-11 items-center justify-center border border-ink/25 text-ink transition hover:border-racing hover:bg-racing hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing lg:inline-flex"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-ink/10 pt-3 lg:hidden">
          <p className="min-w-0 text-[10px] font-bold uppercase tracking-[0.08em] text-ink/50">
            {[
              car.stockCode ? `Stock ${car.stockCode}` : null,
              car.bodyType,
              car.exteriorColor,
              car.engine
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <SaveCompareControls
            car={car}
            compact
            showCompareLink={false}
            className="shrink-0 [&_button]:!h-9 [&_button]:!min-h-9 [&_button]:!rounded-none [&_button]:!px-3 [&_button]:!text-xs"
          />
        </div>
      </div>
    </article>
  );
}

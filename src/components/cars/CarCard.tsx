import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Gauge, Fuel, CalendarDays, Settings2 } from "lucide-react";
import type { SerializedCar } from "@/lib/cars";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CarCard({ car, priority = false }: { car: SerializedCar; priority?: boolean }) {
  const image = car.images[0];
  const carName = `${car.year} ${car.brand} ${car.model}`;

  return (
    <article className="h-full">
      <Link
        href={`/cars/${car.slug}`}
        aria-label={`View ${carName}`}
        className="group flex h-full flex-col overflow-hidden rounded-md border border-ink/10 bg-white shadow-panel transition duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-4 focus-visible:ring-offset-smoke motion-reduce:transition-none"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200">
          {image ? (
            <Image
              src={runtimeImageUrl(image.url)}
              alt={image.altText}
              fill
              unoptimized={isRuntimeImage(image.url)}
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-700 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm font-medium text-ink/65">
              Photo coming soon
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/45 to-transparent" />
          <div className="absolute left-4 top-4">
            <StatusBadge status={car.status} />
          </div>
          <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-ink/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {car.condition}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">
                {car.year} · {car.brand}
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight tracking-[-0.02em] text-ink transition group-hover:text-copper">
                {car.model}
              </h3>
            </div>
            <p className="shrink-0 text-right text-lg font-black tracking-[-0.02em] text-ink">
              {car.formattedPrice}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-ink/10 py-4 text-sm text-ink/75">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-copper" aria-hidden="true" />
              <dt className="sr-only">Year</dt>
              <dd className="truncate">{car.year}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Gauge className="h-4 w-4 shrink-0 text-copper" aria-hidden="true" />
              <dt className="sr-only">Mileage</dt>
              <dd className="truncate">{formatMileage(car.mileage)}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Settings2 className="h-4 w-4 shrink-0 text-copper" aria-hidden="true" />
              <dt className="sr-only">Transmission</dt>
              <dd className="truncate">{titleCaseEnum(car.transmission)}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Fuel className="h-4 w-4 shrink-0 text-copper" aria-hidden="true" />
              <dt className="sr-only">Fuel type</dt>
              <dd className="truncate">{titleCaseEnum(car.fuelType)}</dd>
            </div>
          </dl>

          <div className="mt-auto flex min-h-12 items-end justify-between gap-4 pt-4">
            <p className="line-clamp-1 text-sm text-ink/65">{car.engine}</p>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-ink transition group-hover:text-copper">
              View vehicle
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

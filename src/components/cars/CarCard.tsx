import Image from "next/image";
import Link from "next/link";
import { Gauge, Fuel, CalendarDays, Settings2 } from "lucide-react";
import type { SerializedCar } from "@/lib/cars";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CarCard({ car, priority = false }: { car: SerializedCar; priority?: boolean }) {
  const image = car.images[0];

  return (
    <article className="group overflow-hidden rounded-md border border-ink/10 bg-white shadow-panel transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/cars/${car.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200">
          {image ? (
            <Image
              src={runtimeImageUrl(image.url)}
              alt={image.altText}
              fill
              unoptimized={isRuntimeImage(image.url)}
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-ink/50">
              Image unavailable
            </div>
          )}
          <div className="absolute left-4 top-4">
            <StatusBadge status={car.status} />
          </div>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">
              {car.brand}
            </p>
            <h2 className="mt-1 text-xl font-black text-ink">
              <Link href={`/cars/${car.slug}`} className="transition hover:text-copper">
                {car.model}
              </Link>
            </h2>
          </div>
          <p className="shrink-0 text-right text-lg font-black text-ink">{car.formattedPrice}</p>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/62">{car.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm text-ink/72">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-copper" aria-hidden="true" />
            <dt className="sr-only">Year</dt>
            <dd>{car.year}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-copper" aria-hidden="true" />
            <dt className="sr-only">Mileage</dt>
            <dd>{formatMileage(car.mileage)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-copper" aria-hidden="true" />
            <dt className="sr-only">Transmission</dt>
            <dd>{titleCaseEnum(car.transmission)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-copper" aria-hidden="true" />
            <dt className="sr-only">Fuel type</dt>
            <dd>{titleCaseEnum(car.fuelType)}</dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-5">
          <span className="text-sm font-medium text-ink/55">{car.condition}</span>
          <Link
            href={`/cars/${car.slug}`}
            className="text-sm font-bold text-ink transition hover:text-copper"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

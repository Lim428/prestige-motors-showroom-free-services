import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function EmptyInventory() {
  return (
    <div
      className="rounded-md border border-dashed border-ink/25 bg-white px-6 py-14 text-center shadow-panel sm:py-16"
      role="status"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-smoke">
        <SearchX className="h-7 w-7 text-copper" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-copper">
        No exact match
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.02em] text-ink sm:text-3xl">
        Let&apos;s broaden the search.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">
        Try removing a preference, increasing the maximum price, or return to the full
        showroom to see every current vehicle.
      </p>
      <ButtonLink
        href="/#inventory"
        className="mt-7 min-h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2"
      >
        Reset and view all cars
      </ButtonLink>
    </div>
  );
}

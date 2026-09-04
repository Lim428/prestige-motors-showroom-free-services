import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function EmptyInventory() {
  return (
    <div
      className="border border-ink/25 bg-smoke/40 px-6 py-14 text-center sm:py-16"
      role="status"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center border border-ink/20 bg-white">
        <SearchX className="h-7 w-7 text-racing" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-racing">
        No exact match
      </p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-[-0.03em] text-ink sm:text-5xl">
        Let&apos;s broaden the search.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">
        Try removing a preference, increasing the maximum price, or return to the full
        showroom to see every current vehicle.
      </p>
      <ButtonLink
        href="/#inventory"
        className="mt-7 min-h-12 !rounded-none !border-racing !bg-racing uppercase tracking-[0.06em] text-white hover:!border-ink hover:!bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2"
      >
        Reset and view all cars
      </ButtonLink>
    </div>
  );
}

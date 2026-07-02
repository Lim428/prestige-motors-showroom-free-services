import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function EmptyInventory() {
  return (
    <div className="rounded-md border border-dashed border-ink/20 bg-white px-6 py-16 text-center shadow-panel">
      <SearchX className="mx-auto h-10 w-10 text-copper" />
      <h2 className="mt-5 text-2xl font-black text-ink">No vehicles match these filters.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/62">
        Adjust the showroom filters or clear them to see the full inventory.
      </p>
      <ButtonLink href="/" className="mt-7">
        View all cars
      </ButtonLink>
    </div>
  );
}

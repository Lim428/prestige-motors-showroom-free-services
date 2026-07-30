import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[78vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div className="rounded-3xl border border-ink/10 bg-white px-6 py-12 shadow-panel sm:px-12">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-copper">
          404 · Off the lot
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">
          This page is no longer in the showroom.
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/70">
          The vehicle may have moved, sold, or been removed. The current collection is
          waiting back in the showroom.
        </p>
        <ButtonLink className="mt-8" href="/">
          Browse current inventory
        </ButtonLink>
      </div>
    </main>
  );
}

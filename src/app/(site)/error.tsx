"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-[72vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div className="border-y border-ink/20 bg-white px-6 py-12 sm:px-12">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-copper">
          Showroom temporarily unavailable
        </p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.92] tracking-tight text-ink sm:text-7xl">
          We could not bring the cars into view.
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/70">
          This is usually temporary. Try loading the showroom again in a moment.
        </p>
        <Button className="mt-8" onClick={reset}>
          Reload showroom
        </Button>
      </div>
    </main>
  );
}

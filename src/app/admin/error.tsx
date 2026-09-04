"use client";

import { Button } from "@/components/ui/Button";

export default function AdminError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="admin-content"
      className="mx-auto grid min-h-screen max-w-3xl place-items-center px-4 py-16 text-center"
    >
      <section className="border-y border-ink/20 bg-white px-6 py-12 sm:px-12">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-copper">
          Operations temporarily unavailable
        </p>
        <h1 className="mt-4 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink sm:text-6xl">
          The dashboard could not load.
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/70">
          Your data has not been changed. Try reconnecting to the operations dashboard.
        </p>
        <Button className="mt-8" onClick={reset}>
          Reload dashboard
        </Button>
      </section>
    </main>
  );
}

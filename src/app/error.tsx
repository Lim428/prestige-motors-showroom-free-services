"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-copper">
          Something went sideways
        </p>
        <h1 className="mt-4 text-4xl font-black text-ink">The showroom could not load.</h1>
        <p className="mt-4 text-ink/65">{error.message}</p>
        <Button className="mt-8" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}

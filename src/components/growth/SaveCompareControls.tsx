"use client";

import Link from "next/link";
import { Check, GitCompareArrows, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SerializedCar } from "@/lib/cars";
import { trackGrowthEvent } from "@/lib/growth-client";
import {
  readShortlist,
  removeFromShortlist,
  saveToShortlist,
  SHORTLIST_LIMIT,
  subscribeToShortlist,
  toShortlistCar
} from "@/lib/shortlist";
import { cn } from "@/lib/utils";

export type SaveCompareControlsProps = {
  car: SerializedCar;
  className?: string;
  compact?: boolean;
  showCompareLink?: boolean;
};

export function SaveCompareControls({
  car,
  className,
  compact = false,
  showCompareLink = true
}: SaveCompareControlsProps) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => setSavedIds(readShortlist().map((item) => item.id));
    update();
    return subscribeToShortlist(update);
  }, []);

  const isSaved = savedIds.includes(car.id);

  function toggleSaved() {
    setMessage("");

    try {
      if (isSaved) {
        removeFromShortlist(car.id);
        setMessage("Removed from your shortlist.");
        return;
      }

      const result = saveToShortlist(toShortlistCar(car));

      if (!result.added && result.reason === "limit") {
        setMessage(`You can compare up to ${SHORTLIST_LIMIT} vehicles. Remove one to add another.`);
        return;
      }

      if (result.added) {
        setMessage("Saved. It is ready to compare.");
        trackGrowthEvent("CAR_SAVED", { carId: car.id });
      }
    } catch {
      setMessage("This browser could not save your shortlist. Please check storage permissions.");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggleSaved}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${car.year} ${car.brand} ${car.model} from saved cars` : `Save ${car.year} ${car.brand} ${car.model} for comparison`}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2",
          compact ? "h-10 px-3" : "min-h-12 px-4",
          isSaved
            ? "border-racing bg-racing text-white hover:bg-racing/90"
            : "border-ink/15 bg-white text-ink hover:border-ink/35 hover:bg-smoke"
        )}
      >
        {isSaved ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Heart className="h-4 w-4" aria-hidden="true" />
        )}
        {isSaved ? "Saved" : "Save car"}
        {isSaved ? <X className="h-3.5 w-3.5 opacity-60" aria-hidden="true" /> : null}
      </button>

      {showCompareLink ? (
        <Link
          href="/compare"
          onClick={() =>
            trackGrowthEvent("COMPARE_USED", {
              carId: car.id,
              metadata: { shortlistSize: savedIds.length }
            })
          }
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-smoke text-sm font-black text-ink transition hover:border-ink/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2",
            compact ? "h-10 px-3" : "min-h-12 px-4"
          )}
        >
          <GitCompareArrows className="h-4 w-4 text-copper" aria-hidden="true" />
          Compare
          <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] text-white">
            {savedIds.length}
          </span>
        </Link>
      ) : null}

      {message ? (
        <p
          className="basis-full text-xs font-semibold leading-5 text-ink/55"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

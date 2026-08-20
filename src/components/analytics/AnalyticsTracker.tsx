"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  trackEngagement,
  type AnalyticsEventName,
} from "@/lib/clientAnalytics";

export function AnalyticsTracker({
  event,
  carId,
  metadata,
}: {
  event: AnalyticsEventName;
  carId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const pathname = usePathname();
  const lastTrackedKey = useRef("");

  useEffect(() => {
    const key = `${event}:${carId ?? "site"}:${pathname}`;

    if (lastTrackedKey.current === key) {
      return;
    }

    lastTrackedKey.current = key;
    trackEngagement(event, { carId, metadata, path: pathname });
  }, [carId, event, metadata, pathname]);

  return null;
}

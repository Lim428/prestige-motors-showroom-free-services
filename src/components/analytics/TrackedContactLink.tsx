"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEngagement } from "@/lib/clientAnalytics";

export function TrackedContactLink({
  carId,
  channel,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  carId?: string;
  channel: "phone" | "whatsapp";
  children: ReactNode;
}) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEngagement(
          channel === "whatsapp" ? "WHATSAPP_CLICK" : "PHONE_CLICK",
          { carId, metadata: { channel } },
        );

        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

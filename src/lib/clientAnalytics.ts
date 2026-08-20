export type AnalyticsEventName =
  | "PAGE_VIEW"
  | "VEHICLE_VIEW"
  | "WHATSAPP_CLICK"
  | "PHONE_CLICK"
  | "GALLERY_INTERACTION"
  | "AI_CHAT_STARTED"
  | "FINANCE_CALCULATED"
  | "COMPARE_USED"
  | "CAR_SAVED"
  | "TRUST_REPORT_DOWNLOADED";

type AnalyticsMetadata = Record<string, string | number | boolean | null>;

const sessionStorageKey = "prestige-motors-session-id";

function sessionId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const existing = window.sessionStorage.getItem(sessionStorageKey);

  if (existing) {
    return existing;
  }

  const created =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(sessionStorageKey, created);
  return created;
}

export function trackEngagement(
  event: AnalyticsEventName,
  options: {
    carId?: string;
    metadata?: AnalyticsMetadata;
    path?: string;
  } = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    event,
    carId: options.carId,
    sessionId: sessionId(),
    path: options.path ?? `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
    metadata: options.metadata,
  });

  if (typeof navigator.sendBeacon === "function") {
    const queued = navigator.sendBeacon(
      "/api/analytics",
      new Blob([body], { type: "application/json" })
    );

    if (queued) {
      return;
    }
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt the buyer journey.
  });
}

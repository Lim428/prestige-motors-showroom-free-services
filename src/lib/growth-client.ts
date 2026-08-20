import { trackEngagement } from "@/lib/clientAnalytics";

export type GrowthEvent =
  | "PAGE_VIEW"
  | "VEHICLE_VIEW"
  | "WHATSAPP_CLICK"
  | "AI_CHAT_STARTED"
  | "FINANCE_CALCULATED"
  | "COMPARE_USED"
  | "CAR_SAVED"
  | "TRUST_REPORT_DOWNLOADED";

type AnalyticsMetadata = Record<string, string | number | boolean | null>;

export function trackGrowthEvent(
  event: GrowthEvent,
  options: { carId?: string; metadata?: AnalyticsMetadata } = {}
) {
  trackEngagement(event, options);
}

export async function apiErrorMessage(response: Response, fallback: string) {
  try {
    const result = (await response.json()) as { error?: string };
    return result.error ?? fallback;
  } catch {
    return fallback;
  }
}

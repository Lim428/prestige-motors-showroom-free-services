import { handleRouteError, ok, fail } from "@/lib/api";
import {
  askGemini,
  buildFallbackReply,
  getAssistantCars,
  type AssistantModeReason
} from "@/lib/assistant";
import { assistantRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const windowMs = 60_000;
const maxRequests = 20;
const maxBuckets = 5_000;
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastCleanupAt = 0;

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);

    if (!allowRequest(ip)) {
      return fail("Please wait a moment before asking again.", 429);
    }

    const payload = assistantRequestSchema.parse(await request.json());
    const cars = await getAssistantCars();
    let reason: AssistantModeReason = "not_configured";

    try {
      const reply = await askGemini(payload, cars);

      if (reply) {
        return ok({
          reply,
          mode: "ai",
          carIds: referencedCarIds(reply, cars)
        });
      }
    } catch (error) {
      reason = "provider_error";
      console.error(
        "Assistant AI provider failed:",
        error instanceof Error ? error.message : "Unknown provider error"
      );
    }

    const reply = buildFallbackReply(payload.message, cars);

    return ok({
      reply,
      mode: "basic",
      reason,
      carIds: referencedCarIds(reply, cars)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function referencedCarIds(
  reply: string,
  cars: Array<{ id: string; slug: string; brand: string; model: string }>
) {
  const normalizedReply = reply.toLowerCase();

  return cars
    .filter(
      (car) =>
        normalizedReply.includes(`/cars/${car.slug.toLowerCase()}`) ||
        normalizedReply.includes(`${car.brand} ${car.model}`.toLowerCase())
    )
    .map((car) => car.id)
    .slice(0, 4);
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function allowRequest(key: string) {
  const now = Date.now();

  if (now - lastCleanupAt >= windowMs) {
    for (const [bucketKey, bucketValue] of buckets) {
      if (bucketValue.resetAt <= now) {
        buckets.delete(bucketKey);
      }
    }

    lastCleanupAt = now;
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= maxBuckets) {
      const oldestKey = buckets.keys().next().value;

      if (oldestKey) {
        buckets.delete(oldestKey);
      }
    }

    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
}

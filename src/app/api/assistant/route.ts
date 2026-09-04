import { handleRouteError, ok, fail } from "@/lib/api";
import {
  askGemini,
  buildFallbackReply,
  getAssistantCars,
  type AssistantModeReason
} from "@/lib/assistant";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { assistantRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // The local visual catalog intentionally runs without a database. Every
    // deployed environment still uses the shared database-backed limiter.
    if (process.env.NODE_ENV === "production" || process.env.SHOWROOM_PREVIEW !== "true") {
      await enforceRateLimit(request, "assistant", {
        limit: 20,
        windowMs: 60_000,
        message: "Please wait a moment before asking again."
      });
    }

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return fail("Invalid JSON request payload.", 400);
    }

    const payload = assistantRequestSchema.parse(requestBody);
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
      console.error("Assistant AI provider failed.", {
        errorType: error instanceof Error ? error.name : "UnknownError"
      });
    }

    const reply = buildFallbackReply(
      payload.message,
      cars,
      payload.locale,
      payload.history
    );

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

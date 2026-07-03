import { handleRouteError, ok, fail } from "@/lib/api";
import { askGemini, buildFallbackReply, getAssistantCars } from "@/lib/assistant";
import { assistantRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

const windowMs = 60_000;
const maxRequests = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);

    if (!allowRequest(ip)) {
      return fail("Please wait a moment before asking again.", 429);
    }

    const payload = assistantRequestSchema.parse(await request.json());
    const cars = await getAssistantCars();

    try {
      const reply = await askGemini(payload, cars);

      if (reply) {
        return ok({ reply, mode: "ai" });
      }
    } catch (error) {
      console.error("Assistant AI failed:", error);
    }

    return ok({
      reply: buildFallbackReply(payload.message, cars),
      mode: "basic"
    });
  } catch (error) {
    return handleRouteError(error);
  }
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
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
}

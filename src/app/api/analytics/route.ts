import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { prisma } from "@/lib/prisma";
import { analyticsEventInputSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "analytics", { limit: 120, windowMs: 60_000 });
    const payload = analyticsEventInputSchema.parse(await request.json());

    if (payload.carId) {
      const car = await prisma.car.findUnique({
        where: { id: payload.carId },
        select: { id: true }
      });
      if (!car) {
        return fail("Vehicle not found.", 404);
      }
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        event: payload.event,
        carId: payload.carId,
        sessionId: payload.sessionId,
        path: payload.path,
        referrer: payload.referrer,
        metadata: payload.metadata
      },
      select: { id: true }
    });

    return ok({ accepted: true, id: event.id }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}

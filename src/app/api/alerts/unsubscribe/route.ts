import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectTo(request: Request, state: "done" | "invalid") {
  return Response.redirect(new URL(`/alerts/unsubscribe?state=${state}`, request.url), 303);
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "alert-unsubscribe", {
      limit: 20,
      windowMs: 10 * 60_000,
    });
    const formData = await request.formData();
    const token = formData.get("token");

    if (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)) {
      return redirectTo(request, "invalid");
    }

    const result = await prisma.stockAlert.updateMany({
      where: { unsubscribeToken: token },
      data: { status: "UNSUBSCRIBED" },
    });

    return redirectTo(request, result.count > 0 ? "done" : "invalid");
  } catch {
    return redirectTo(request, "invalid");
  }
}

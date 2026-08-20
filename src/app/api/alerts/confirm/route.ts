import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmationState = "done" | "expired" | "invalid";

function redirectTo(request: Request, state: ConfirmationState) {
  return Response.redirect(new URL(`/alerts/confirm?state=${state}`, request.url), 303);
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "alert-confirm", {
      limit: 20,
      windowMs: 10 * 60_000
    });
    const formData = await request.formData();
    const token = formData.get("token");

    if (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)) {
      return redirectTo(request, "invalid");
    }

    const alert = await prisma.stockAlert.findUnique({
      where: { verificationToken: token },
      select: {
        id: true,
        email: true,
        type: true,
        status: true,
        verifiedAt: true,
        verificationExpiresAt: true,
        carId: true
      }
    });

    if (!alert || alert.status === "UNSUBSCRIBED") {
      return redirectTo(request, "invalid");
    }

    if (alert.verifiedAt) {
      return redirectTo(request, "done");
    }

    const now = new Date();
    if (!alert.verificationExpiresAt || alert.verificationExpiresAt <= now) {
      return redirectTo(request, "expired");
    }

    const activated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.stockAlert.updateMany({
        where: {
          id: alert.id,
          status: "PENDING_VERIFICATION",
          verifiedAt: null,
          verificationExpiresAt: { gt: now }
        },
        data: {
          status: "ACTIVE",
          verifiedAt: now
        }
      });

      if (result.count > 0) {
        await Promise.all([
          transaction.notification.create({
            data: {
              type: "STOCK_ALERT_CREATED",
              title: "Vehicle alert verified and active",
              message: `${alert.email} confirmed ownership of the email address for ${alert.type.toLowerCase().replaceAll("_", " ")} alerts.`,
              actionUrl: "/admin?tab=growth&section=alerts",
              entityType: "StockAlert",
              entityId: alert.id
            }
          }),
          transaction.analyticsEvent.create({
            data: { event: "STOCK_ALERT_CREATED", carId: alert.carId }
          })
        ]);
      }

      return result.count > 0;
    });

    if (!activated) {
      const latest = await prisma.stockAlert.findUnique({
        where: { id: alert.id },
        select: { verifiedAt: true }
      });

      return redirectTo(request, latest?.verifiedAt ? "done" : "invalid");
    }

    return redirectTo(request, "done");
  } catch {
    return redirectTo(request, "invalid");
  }
}

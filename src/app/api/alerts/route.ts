import { created, fail, handleRouteError } from "@/lib/api";
import { after } from "next/server";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { sendDealerNotification, sendTransactionalEmail } from "@/lib/email";
import { createAdminNotification } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import { stockAlertInputSchema } from "@/lib/validators";
import { dealerName, siteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verificationLifetimeMs = 48 * 60 * 60 * 1_000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "stock-alert", { limit: 20, windowMs: 10 * 60_000 });
    const payload = stockAlertInputSchema.parse(await request.json());

    const watchedCar = payload.carId
      ? await prisma.car.findUnique({
          where: { id: payload.carId },
          select: { id: true, status: true, isPublished: true }
        })
      : null;

    if (payload.carId && (!watchedCar || !watchedCar.isPublished)) {
      return fail("Vehicle not found.", 404);
    }

    const verificationExpiresAt = new Date(Date.now() + verificationLifetimeMs);

    const alert = await prisma.$transaction(async (transaction) => {
      const createdAlert = await transaction.stockAlert.create({
        data: {
          name: payload.name || null,
          email: payload.email.toLowerCase(),
          phone: payload.phone || null,
          channel: payload.channel,
          type: payload.type,
          status: "PENDING_VERIFICATION",
          carId: payload.carId,
          brand: payload.criteria.brand || null,
          model: payload.criteria.model || null,
          fuelType: payload.criteria.fuelType,
          minPrice: payload.criteria.minPrice,
          maxPrice: payload.criteria.maxPrice,
          consentAt: new Date(),
          verificationExpiresAt,
          lastKnownCarStatus: watchedCar?.status
        },
        select: {
          id: true,
          status: true,
          type: true,
          channel: true,
          createdAt: true,
          verificationToken: true,
          unsubscribeToken: true
        }
      });

      await createAdminNotification(
        {
          type: "STOCK_ALERT_CREATED",
          title: "Stock alert awaiting email verification",
          message: `${payload.email} requested ${payload.type.toLowerCase().replaceAll("_", " ")} alerts. Delivery stays paused until the address is verified.`,
          actionUrl: "/admin?tab=growth&section=alerts",
          entityType: "StockAlert",
          entityId: createdAlert.id
        },
        transaction
      );

      return createdAlert;
    });

    const confirmationUrl = `${siteUrl()}/alerts/confirm?token=${encodeURIComponent(alert.verificationToken)}`;
    const unsubscribeUrl = `${siteUrl()}/alerts/unsubscribe?token=${encodeURIComponent(alert.unsubscribeToken)}`;
    const confirmationDelivery = await sendTransactionalEmail({
      to: payload.email,
      subject: `Confirm your ${dealerName()} vehicle alert`,
      idempotencyKey: `stock-alert-confirmation-${alert.id}`,
      text: `Confirm that you own this email address to activate your ${payload.type.toLowerCase().replaceAll("_", " ")} alert. Confirm within 48 hours: ${confirmationUrl}\n\nIf you did not request this alert, no action is needed. Stop this request: ${unsubscribeUrl}`,
      html: `<h2>Confirm your vehicle alert</h2><p>Confirm that you own this email address to activate your ${escapeHtml(payload.type.toLowerCase().replaceAll("_", " "))} alert.</p><p><a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;background:#0f5847;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Confirm my alert</a></p><p>This link expires in 48 hours. If you did not request this alert, no action is needed.</p><p style="margin-top:24px;font-size:12px"><a href="${escapeHtml(unsubscribeUrl)}">Stop this request</a></p>`
    });

    after(async () => {
      await sendDealerNotification({
        subject: `New ${payload.type.toLowerCase().replaceAll("_", " ")} alert request`,
        title: "A buyer requested a vehicle alert",
        idempotencyKey: `dealer-stock-alert-${alert.id}`,
        details: [
          { label: "Customer", value: payload.name || "Not provided" },
          { label: "Email", value: payload.email },
          { label: "Phone", value: payload.phone || "Not provided" },
          { label: "Preferred channel", value: payload.channel },
          { label: "Alert type", value: payload.type.replaceAll("_", " ") },
          { label: "Status", value: "Awaiting email verification" },
          {
            label: "Criteria",
            value:
              [payload.criteria.brand, payload.criteria.model, payload.criteria.fuelType]
                .filter(Boolean)
                .join(" ") || (payload.carId ? "Specific vehicle" : "Any matching stock")
          }
        ],
        actionPath: "/admin?tab=growth&section=alerts"
      });
    });

    return created({
      id: alert.id,
      status: alert.status,
      type: alert.type,
      channel: alert.channel,
      createdAt: alert.createdAt,
      verificationEmailSent: confirmationDelivery.delivered
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

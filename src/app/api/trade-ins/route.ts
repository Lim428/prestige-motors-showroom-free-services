import { created, handleRouteError } from "@/lib/api";
import { after } from "next/server";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { sendDealerNotification } from "@/lib/email";
import { createAdminNotification } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import { tradeInInputSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "trade-in", { limit: 10, windowMs: 10 * 60_000 });
    const payload = tradeInInputSchema.parse(await request.json());

    const tradeIn = await prisma.$transaction(async (transaction) => {
      const lead = await transaction.lead.create({
        data: {
          name: payload.name,
          email: payload.email.toLowerCase(),
          phone: payload.phone,
          source: "TRADE_IN",
          priority: "HIGH",
          summary: `Trade-in appraisal requested for a ${payload.year} ${payload.make} ${payload.model} with ${payload.mileage.toLocaleString("en-MY")} km.`,
          preferredCarIds: [],
          consentAt: new Date()
        }
      });
      const createdTradeIn = await transaction.tradeIn.create({
        data: {
          name: payload.name,
          email: payload.email.toLowerCase(),
          phone: payload.phone,
          make: payload.make,
          model: payload.model,
          year: payload.year,
          mileage: payload.mileage,
          registration: payload.registration || null,
          condition: payload.condition,
          expectedPrice: payload.expectedPrice,
          notes: payload.notes || null,
          consentAt: new Date(),
          leadId: lead.id,
          images: {
            create: payload.images.map((image, index) => ({
              url: image.url,
              publicId: image.publicId,
              altText: image.altText,
              sortOrder: image.sortOrder ?? index
            }))
          }
        },
        select: { id: true, status: true, createdAt: true }
      });

      await Promise.all([
        createAdminNotification(
          {
            type: "TRADE_IN_SUBMITTED",
            title: "New trade-in appraisal",
            message: `${payload.name} submitted a ${payload.year} ${payload.make} ${payload.model}.`,
            actionUrl: "/admin?tab=growth&section=trade-ins",
            entityType: "TradeIn",
            entityId: createdTradeIn.id
          },
          transaction
        ),
        transaction.analyticsEvent.create({ data: { event: "TRADE_IN_SUBMITTED" } })
      ]);

      return createdTradeIn;
    });

    after(async () => {
      await sendDealerNotification({
        subject: `New trade-in appraisal: ${payload.year} ${payload.make} ${payload.model}`,
        title: "A trade-in appraisal is ready for review",
        idempotencyKey: `dealer-trade-in-${tradeIn.id}`,
        details: [
          { label: "Customer", value: payload.name },
          { label: "Email", value: payload.email },
          { label: "Phone", value: payload.phone },
          { label: "Vehicle", value: `${payload.year} ${payload.make} ${payload.model}` },
          { label: "Mileage", value: `${payload.mileage.toLocaleString("en-MY")} km` },
          { label: "Condition", value: payload.condition }
        ],
        actionPath: "/admin?tab=growth&section=trade-ins"
      });
    });

    return created(tradeIn);
  } catch (error) {
    return handleRouteError(error);
  }
}

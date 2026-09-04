import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { created, fail, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { sendDealerNotification } from "@/lib/email";
import { summarizeLead } from "@/lib/lead-ai";
import { createAdminNotification } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import { leadInputSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const publicLeadSource = "AI_ASSISTANT" as const;

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "lead", { limit: 10, windowMs: 10 * 60_000 });
    const payload = leadInputSchema.parse(await request.json());
    const vehicleIds = [...new Set(payload.vehicleIds)];
    const vehicles = vehicleIds.length
      ? await prisma.car.findMany({
          where: { id: { in: vehicleIds }, isPublished: true },
          select: { id: true, brand: true, model: true, year: true }
        })
      : [];

    if (vehicles.length !== vehicleIds.length) {
      return fail("One or more selected vehicles could not be found.", 404);
    }

    const qualification = await summarizeLead({
      name: payload.name,
      source: publicLeadSource,
      budgetMin: payload.budgetMin,
      budgetMax: payload.budgetMax,
      vehicleNames: vehicles.map(
        (vehicle) => `${vehicle.year} ${vehicle.brand} ${vehicle.model}`
      ),
      transcript: payload.transcript
    });
    const summary = [
      payload.summary || qualification.summary,
      `Buyer intent: ${qualification.buyerIntent}`,
      `Recommended follow-up: ${qualification.recommendedFollowUp}`
    ].join("\n");

    const lead = await prisma.$transaction(async (transaction) => {
      const createdLead = await transaction.lead.create({
        data: {
          name: payload.name,
          email: payload.email.toLowerCase(),
          phone: payload.phone || null,
          source: publicLeadSource,
          priority: qualification.priority,
          summary,
          transcript: payload.transcript.length
            ? (payload.transcript as Prisma.InputJsonValue)
            : undefined,
          budgetMin: payload.budgetMin ?? qualification.budgetMin ?? undefined,
          budgetMax: payload.budgetMax ?? qualification.budgetMax ?? undefined,
          preferredCarIds: vehicleIds,
          carId: vehicleIds[0],
          consentAt: new Date()
        },
        select: {
          id: true,
          status: true,
          priority: true,
          createdAt: true
        }
      });

      await createAdminNotification(
        {
          type: "NEW_LEAD",
          title: "New sales lead",
          message: `${payload.name} submitted an AI assistant lead.`,
          actionUrl: "/admin?tab=growth&section=leads",
          entityType: "Lead",
          entityId: createdLead.id
        },
        transaction
      );

      await transaction.analyticsEvent.create({
        data: {
          event: "AI_LEAD_CAPTURED",
          carId: vehicleIds[0]
        }
      });

      return createdLead;
    });

    after(async () => {
      await sendDealerNotification({
        subject: `New sales lead: ${payload.name}`,
        title: "A new buyer lead is ready for follow-up",
        idempotencyKey: `dealer-lead-${lead.id}`,
        details: [
          { label: "Buyer", value: payload.name },
          { label: "Email", value: payload.email },
          { label: "Phone", value: payload.phone || "Not provided" },
          { label: "Source", value: "AI ASSISTANT" },
          { label: "Priority", value: lead.priority },
          {
            label: "Vehicles",
            value:
              vehicles
                .map((vehicle) => `${vehicle.year} ${vehicle.brand} ${vehicle.model}`)
                .join(", ") || "Not selected"
          }
        ],
        actionPath: "/admin?tab=growth&section=leads"
      });
    });

    return created(lead);
  } catch (error) {
    return handleRouteError(error);
  }
}

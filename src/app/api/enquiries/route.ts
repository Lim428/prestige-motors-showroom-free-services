import { created, fail, handleRouteError } from "@/lib/api";
import { after } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { dealerEmail, dealerName } from "@/lib/utils";
import { enquiryInputSchema } from "@/lib/validators";

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
    const payload = enquiryInputSchema.parse(await request.json());

    if (payload.carId) {
      const car = await prisma.car.findUnique({
        where: { id: payload.carId },
        select: { id: true }
      });

      if (!car) {
        return fail("Vehicle not found.", 404);
      }
    }

    const enquiry = await prisma.$transaction(async (transaction) => {
      const createdEnquiry = await transaction.enquiry.create({
        data: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone || null,
          message: payload.message,
          carId: payload.carId
        }
      });
      const lead = await transaction.lead.create({
        data: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone || null,
          source: "ENQUIRY",
          priority: "HIGH",
          summary: payload.message,
          preferredCarIds: payload.carId ? [payload.carId] : [],
          carId: payload.carId,
          consentAt: new Date()
        }
      });

      await transaction.notification.create({
        data: {
          type: "NEW_LEAD",
          title: `New vehicle enquiry from ${payload.name}`,
          message: payload.message,
          actionUrl: "/admin?tab=enquiries",
          entityType: "Lead",
          entityId: lead.id
        }
      });

      await transaction.analyticsEvent.create({
        data: {
          event: "ENQUIRY_SUBMITTED",
          carId: payload.carId
        }
      });

      return createdEnquiry;
    });

    const salesEmail = dealerEmail();

    if (salesEmail) {
      after(async () => {
        await sendTransactionalEmail({
          to: salesEmail,
          subject: `New website enquiry from ${payload.name}`,
          idempotencyKey: `enquiry-${enquiry.id}`,
          text: `${payload.name} (${payload.email}${payload.phone ? `, ${payload.phone}` : ""})\n\n${payload.message}`,
          html: `<h2>New website enquiry</h2><p><strong>${escapeHtml(payload.name)}</strong> submitted an enquiry to ${escapeHtml(dealerName())}.</p><p>Email: ${escapeHtml(payload.email)}${payload.phone ? `<br>Phone: ${escapeHtml(payload.phone)}` : ""}</p><p>${escapeHtml(payload.message).replace(/\n/g, "<br>")}</p>`
        });
      });
    }

    return created(enquiry);
  } catch (error) {
    return handleRouteError(error);
  }
}

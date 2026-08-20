import { Prisma } from "@prisma/client";
import { fail, handleRouteError, ok } from "@/lib/api";
import { appointmentRange, slotIsAvailable } from "@/lib/engagement/slots";
import { HttpError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { appointmentAdminUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = appointmentAdminUpdateSchema.parse(await request.json());
    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, carId: true, startAt: true, endAt: true, leadId: true }
    });

    if (!existing) {
      return fail("Appointment not found.", 404);
    }

    const rescheduled = payload.date && payload.time
      ? appointmentRange(payload.date, payload.time)
      : null;
    const appointment = await prisma.$transaction(
      async (transaction) => {
        if (rescheduled) {
          const conflicts = await transaction.appointment.findMany({
            where: {
              id: { not: id },
              startAt: { lt: rescheduled.endAt },
              endAt: { gt: rescheduled.startAt },
              status: { notIn: ["CANCELLED", "NO_SHOW"] }
            },
            select: { carId: true, startAt: true, endAt: true, status: true }
          });
          if (
            !slotIsAvailable(
              conflicts,
              rescheduled.startAt,
              rescheduled.endAt,
              existing.carId ?? undefined
            )
          ) {
            throw new HttpError(409, "That appointment slot is no longer available.");
          }
        }

        const updated = await transaction.appointment.update({
          where: { id },
          data: {
            status: payload.status,
            notes: payload.notes,
            startAt: rescheduled?.startAt,
            endAt: rescheduled?.endAt
          },
          include: {
            car: {
              select: { id: true, slug: true, brand: true, model: true, year: true }
            },
            lead: { select: { id: true, status: true } }
          }
        });

        if (existing.leadId && payload.status === "CONFIRMED") {
          await transaction.lead.update({
            where: { id: existing.leadId },
            data: { status: "APPOINTMENT_SET" }
          });
        }

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return ok(appointment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return fail("That appointment slot was just booked. Please choose another time.", 409);
    }
    return handleRouteError(error);
  }
}

import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { created, fail, handleRouteError, ok } from "@/lib/api";
import {
  appointmentRange,
  buildSlots,
  dayBounds,
  SHOWROOM_TIMEZONE,
  SLOT_MINUTES,
  slotIsAvailable
} from "@/lib/engagement/slots";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { sendDealerNotification } from "@/lib/email";
import { HttpError } from "@/lib/errors";
import { createAdminNotification } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import {
  appointmentAvailabilityQuerySchema,
  appointmentInputSchema
} from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = appointmentAvailabilityQuerySchema.parse(
      Object.fromEntries(url.searchParams)
    );

    if (query.carId) {
      const car = await prisma.car.findUnique({
        where: { id: query.carId },
        select: { id: true, status: true, isPublished: true }
      });

      if (!car || !car.isPublished) {
        return fail("Vehicle not found.", 404);
      }
      if (car.status !== "AVAILABLE") {
        return fail("This vehicle is not currently available for a test drive.", 409);
      }
    }

    const bounds = dayBounds(query.date);
    const appointments = await prisma.appointment.findMany({
      where: {
        startAt: { lt: bounds.end },
        endAt: { gt: bounds.start },
        status: { notIn: ["CANCELLED", "NO_SHOW"] }
      },
      select: { carId: true, startAt: true, endAt: true, status: true }
    });

    return ok({
      date: query.date,
      timezone: SHOWROOM_TIMEZONE,
      slotMinutes: SLOT_MINUTES,
      slots: buildSlots(query.date, appointments, query.carId)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "appointment", { limit: 20, windowMs: 10 * 60_000 });
    const payload = appointmentInputSchema.parse(await request.json());
    const { startAt, endAt } = appointmentRange(payload.date, payload.time);

    const appointment = await prisma.$transaction(
      async (transaction) => {
        if (payload.carId) {
          const car = await transaction.car.findUnique({
            where: { id: payload.carId },
            select: {
              id: true,
              status: true,
              isPublished: true,
              brand: true,
              model: true,
              year: true
            }
          });

          if (!car || !car.isPublished) {
            throw new HttpError(404, "Vehicle not found.");
          }
          if (car.status !== "AVAILABLE") {
            throw new HttpError(409, "This vehicle is not currently available for a test drive.");
          }
        }

        const conflicts = await transaction.appointment.findMany({
          where: {
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            status: { notIn: ["CANCELLED", "NO_SHOW"] }
          },
          select: { carId: true, startAt: true, endAt: true, status: true }
        });

        if (!slotIsAvailable(conflicts, startAt, endAt, payload.carId)) {
          throw new HttpError(409, "That appointment slot is no longer available.");
        }

        const lead = await transaction.lead.create({
          data: {
            name: payload.name,
            email: payload.email.toLowerCase(),
            phone: payload.phone,
            source: "TEST_DRIVE",
            priority: "HIGH",
            status: "APPOINTMENT_SET",
            summary: `${payload.type.toLowerCase().replaceAll("_", " ")} requested for ${payload.date} at ${payload.time}.`,
            preferredCarIds: payload.carId ? [payload.carId] : [],
            carId: payload.carId,
            consentAt: new Date()
          }
        });
        const createdAppointment = await transaction.appointment.create({
          data: {
            name: payload.name,
            email: payload.email.toLowerCase(),
            phone: payload.phone,
            type: payload.type,
            notes: payload.notes || null,
            startAt,
            endAt,
            timezone: SHOWROOM_TIMEZONE,
            carId: payload.carId,
            leadId: lead.id,
            consentAt: new Date()
          },
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            createdAt: true
          }
        });

        await Promise.all([
          createAdminNotification(
            {
              type: "APPOINTMENT_REQUEST",
              title: "New appointment request",
              message: `${payload.name} requested ${payload.date} at ${payload.time}.`,
              actionUrl: "/admin?tab=growth&section=appointments",
              entityType: "Appointment",
              entityId: createdAppointment.id
            },
            transaction
          ),
          transaction.analyticsEvent.create({
            data: { event: "TEST_DRIVE_BOOKED", carId: payload.carId }
          })
        ]);

        return createdAppointment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    after(async () => {
      await sendDealerNotification({
        subject: `New appointment request: ${payload.name}`,
        title: "A buyer requested a showroom appointment",
        idempotencyKey: `dealer-appointment-${appointment.id}`,
        details: [
          { label: "Buyer", value: payload.name },
          { label: "Email", value: payload.email },
          { label: "Phone", value: payload.phone },
          { label: "Date", value: payload.date },
          { label: "Time", value: `${payload.time} (${SHOWROOM_TIMEZONE})` },
          { label: "Type", value: payload.type.replaceAll("_", " ") }
        ],
        actionPath: "/admin?tab=growth&section=appointments"
      });
    });

    return created(appointment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return fail("That appointment slot was just booked. Please choose another time.", 409);
    }
    return handleRouteError(error);
  }
}

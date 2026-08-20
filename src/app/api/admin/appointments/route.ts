import { Prisma } from "@prisma/client";
import { handleRouteError, ok } from "@/lib/api";
import { dayBounds } from "@/lib/engagement/slots";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { appointmentAdminQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function malaysiaDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = appointmentAdminQuerySchema.parse(Object.fromEntries(url.searchParams));
    const now = new Date();
    const bounds = query.date
      ? dayBounds(query.date)
      : query.range === "TODAY"
        ? dayBounds(malaysiaDate(now))
        : null;
    const startAt: Prisma.DateTimeFilter | undefined = bounds
      ? { gte: bounds.start, lte: bounds.end }
      : query.range === "UPCOMING"
        ? { gte: now }
        : query.range === "PAST"
          ? { lt: now }
          : undefined;
    const where: Prisma.AppointmentWhereInput = {
      status: query.status,
      startAt
    };
    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          car: {
            select: { id: true, slug: true, brand: true, model: true, year: true }
          },
          lead: { select: { id: true, status: true } }
        },
        orderBy: { startAt: query.range === "PAST" || query.range === "ALL" ? "desc" : "asc" },
        take: query.limit
      }),
      prisma.appointment.count({ where })
    ]);

    return ok({ items, total });
  } catch (error) {
    return handleRouteError(error);
  }
}

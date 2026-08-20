import type { AnalyticsEventName } from "@prisma/client";
import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { analyticsDashboardQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventLabels: Record<AnalyticsEventName, string> = {
  PAGE_VIEW: "Page views",
  VEHICLE_VIEW: "Vehicle views",
  WHATSAPP_CLICK: "WhatsApp clicks",
  PHONE_CLICK: "Phone clicks",
  GALLERY_INTERACTION: "Gallery interactions",
  ENQUIRY_SUBMITTED: "Enquiries",
  AI_CHAT_STARTED: "AI chats",
  AI_LEAD_CAPTURED: "AI leads",
  FINANCE_CALCULATED: "Finance calculations",
  COMPARE_USED: "Vehicle comparisons",
  CAR_SAVED: "Saved vehicles",
  TEST_DRIVE_BOOKED: "Test drives",
  TRADE_IN_SUBMITTED: "Trade-ins",
  STOCK_ALERT_CREATED: "Stock alerts",
  TRUST_REPORT_DOWNLOADED: "Trust report downloads"
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = analyticsDashboardQuerySchema.parse(Object.fromEntries(url.searchParams));
    const to = new Date();
    const from = new Date(to.getTime() - (query.days - 1) * 86_400_000);
    from.setUTCHours(0, 0, 0, 0);
    const createdAt = { gte: from, lte: to };

    const [
      eventGroups,
      leads,
      appointments,
      tradeIns,
      topVehicleGroups,
      eventDates,
      leadDates
    ] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["event"],
        where: { createdAt },
        _count: { _all: true }
      }),
      prisma.lead.count({ where: { createdAt } }),
      prisma.appointment.count({ where: { createdAt } }),
      prisma.tradeIn.count({ where: { createdAt } }),
      prisma.analyticsEvent.groupBy({
        by: ["carId"],
        where: { createdAt, event: "VEHICLE_VIEW", carId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { carId: "desc" } },
        take: 5
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 20_000
      }),
      prisma.lead.findMany({
        where: { createdAt },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 20_000
      })
    ]);
    const counts = new Map(
      eventGroups.map((group) => [group.event, group._count._all] as const)
    );
    const carIds = topVehicleGroups
      .map((group) => group.carId)
      .filter((id): id is string => Boolean(id));
    const cars = await prisma.car.findMany({
      where: { id: { in: carIds } },
      select: { id: true, slug: true, brand: true, model: true }
    });
    const carMap = new Map(cars.map((car) => [car.id, car]));
    const topVehicles = topVehicleGroups.flatMap((group) => {
      const car = group.carId ? carMap.get(group.carId) : null;
      return car ? [{ carId: car.id, ...car, views: group._count._all }] : [];
    });
    const seriesMap = new Map<string, { events: number; leads: number }>();

    for (let index = 0; index < query.days; index += 1) {
      const day = new Date(from.getTime() + index * 86_400_000);
      seriesMap.set(dateKey(day), { events: 0, leads: 0 });
    }
    for (const event of eventDates) {
      const value = seriesMap.get(dateKey(event.createdAt));
      if (value) value.events += 1;
    }
    for (const lead of leadDates) {
      const value = seriesMap.get(dateKey(lead.createdAt));
      if (value) value.leads += 1;
    }

    const vehicleViews = counts.get("VEHICLE_VIEW") ?? 0;
    const whatsappClicks = counts.get("WHATSAPP_CLICK") ?? 0;
    const phoneClicks = counts.get("PHONE_CLICK") ?? 0;
    const events = eventGroups.reduce((sum, group) => sum + group._count._all, 0);

    return ok({
      period: { from: from.toISOString(), to: to.toISOString(), days: query.days },
      totals: {
        events,
        vehicleViews,
        leads,
        appointments,
        tradeIns,
        whatsappClicks,
        phoneClicks
      },
      funnel: [
        { key: "vehicleViews", label: "Vehicle views", count: vehicleViews },
        {
          key: "contactActions",
          label: "Contact actions",
          count: whatsappClicks + phoneClicks + (counts.get("ENQUIRY_SUBMITTED") ?? 0)
        },
        { key: "leads", label: "Qualified leads", count: leads },
        { key: "appointments", label: "Appointments", count: appointments }
      ],
      eventBreakdown: eventGroups
        .map((group) => ({
          event: group.event,
          label: eventLabels[group.event],
          count: group._count._all
        }))
        .sort((a, b) => b.count - a.count),
      topVehicles,
      series: [...seriesMap].map(([date, value]) => ({ date, ...value }))
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

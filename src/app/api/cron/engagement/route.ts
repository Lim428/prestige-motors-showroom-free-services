import { Prisma } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { dealerName, siteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dayInMilliseconds = 24 * 60 * 60 * 1_000;
const stockAlertBatchSize = 100;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const recentReminderCutoff = new Date(now.getTime() - 20 * 60 * 60 * 1_000);
  const appointmentWindowEnd = new Date(now.getTime() + dayInMilliseconds);
  const counters = {
    followUpReminders: 0,
    appointmentReminders: 0,
    alertsMatched: 0,
    emailsDelivered: 0,
    emailDeliveryFailures: 0,
    alertsChecked: 0,
    alertErrors: 0,
  };

  await prisma.apiRateLimit.deleteMany({
    where: {
      resetAt: { lt: new Date(now.getTime() - dayInMilliseconds) },
    },
  });

  const dueLeads = await prisma.lead.findMany({
    where: {
      nextFollowUpAt: { lte: now },
      status: {
        notIn: ["WON", "LOST", "ARCHIVED"],
      },
    },
    select: {
      id: true,
      name: true,
      nextFollowUpAt: true,
    },
    orderBy: { nextFollowUpAt: "asc" },
    take: 100,
  });

  for (const lead of dueLeads) {
    const alreadyReminded = await prisma.notification.findFirst({
      where: {
        type: "FOLLOW_UP_DUE",
        entityType: "Lead",
        entityId: lead.id,
        createdAt: { gte: recentReminderCutoff },
      },
      select: { id: true },
    });

    if (!alreadyReminded) {
      await prisma.notification.create({
        data: {
          type: "FOLLOW_UP_DUE",
          title: `Follow-up due: ${lead.name}`,
          message: `This lead was scheduled for follow-up at ${lead.nextFollowUpAt?.toISOString() ?? "the configured time"}.`,
          actionUrl: "/admin?tab=growth&section=leads",
          entityType: "Lead",
          entityId: lead.id,
        },
      });
      counters.followUpReminders += 1;
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startAt: { gt: now, lte: appointmentWindowEnd },
    },
    include: {
      car: { select: { year: true, brand: true, model: true } },
    },
    orderBy: { startAt: "asc" },
    take: 100,
  });

  for (const appointment of appointments) {
    const alreadyReminded = await prisma.notification.findFirst({
      where: {
        type: "FOLLOW_UP_DUE",
        entityType: "Appointment",
        entityId: appointment.id,
        createdAt: { gte: recentReminderCutoff },
      },
      select: { id: true },
    });

    if (alreadyReminded) {
      continue;
    }

    const vehicle = appointment.car
      ? `${appointment.car.year} ${appointment.car.brand} ${appointment.car.model}`
      : "your selected vehicle";
    const when = new Intl.DateTimeFormat("en-MY", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: appointment.timezone,
    }).format(appointment.startAt);

    const delivery = await sendTransactionalEmail({
      to: appointment.email,
      subject: `${dealerName()} appointment reminder`,
      idempotencyKey: `appointment-reminder-${appointment.id}`,
      text: `Hi ${appointment.name}, this is a reminder for your ${appointment.type.toLowerCase().replaceAll("_", " ")} at ${when} for ${vehicle}.`,
      html: `<h2>Your showroom appointment is coming up</h2><p>Hi ${escapeHtml(appointment.name)},</p><p>This is a reminder for your ${escapeHtml(appointment.type.toLowerCase().replaceAll("_", " "))} at <strong>${escapeHtml(when)}</strong> for ${escapeHtml(vehicle)}.</p>`,
    });

    await prisma.notification.create({
      data: {
        type: "FOLLOW_UP_DUE",
        title: `Appointment reminder: ${appointment.name}`,
        message: `${when} · ${vehicle}${delivery.delivered ? " · Customer emailed" : " · Email requires manual follow-up"}`,
        actionUrl: "/admin?tab=growth&section=appointments",
        entityType: "Appointment",
        entityId: appointment.id,
      },
    });
    counters.appointmentReminders += 1;
    counters.emailsDelivered += delivery.delivered ? 1 : 0;
  }

  const neverCheckedAlerts = await prisma.stockAlert.findMany({
    where: {
      status: { in: ["ACTIVE", "MATCHED"] },
      lastCheckedAt: null,
    },
    include: { car: { select: { status: true, isPublished: true } } },
    orderBy: { createdAt: "asc" },
    take: stockAlertBatchSize,
  });
  const remainingAlertSlots = stockAlertBatchSize - neverCheckedAlerts.length;
  const previouslyCheckedAlerts =
    remainingAlertSlots > 0
      ? await prisma.stockAlert.findMany({
          where: {
            status: { in: ["ACTIVE", "MATCHED"] },
            lastCheckedAt: { not: null },
          },
          include: { car: { select: { status: true, isPublished: true } } },
          orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
          take: remainingAlertSlots,
        })
      : [];
  const alerts = [...neverCheckedAlerts, ...previouslyCheckedAlerts];

  for (const alert of alerts) {
    try {
      const since = alert.lastMatchedAt ?? alert.createdAt;
      const currentWatchedStatus =
        alert.carId && alert.car?.isPublished ? alert.car.status : null;
      const becameAvailable = Boolean(
        alert.carId &&
          alert.lastKnownCarStatus !== "AVAILABLE" &&
          currentWatchedStatus === "AVAILABLE",
      );
      const wantsNewStock = alert.type === "NEW_STOCK" || alert.type === "BOTH";
      const wantsPriceDrops = alert.type === "PRICE_DROP" || alert.type === "BOTH";
      const activityFilters: Prisma.CarWhereInput[] = [];

      if (wantsNewStock && !alert.carId) {
        activityFilters.push({ createdAt: { gt: since } });
      }
      if (wantsPriceDrops) {
        activityFilters.push({
          priceHistory: {
            some: { recordedAt: { gt: since }, previousPrice: { not: null } },
          },
        });
      }
      if (wantsNewStock && becameAvailable && alert.carId) {
        activityFilters.push({ id: alert.carId });
      }

      const carWhere: Prisma.CarWhereInput = {
        isPublished: true,
        status: "AVAILABLE",
        ...(alert.carId ? { id: alert.carId } : {}),
        ...(alert.brand
          ? { brand: { equals: alert.brand, mode: "insensitive" } }
          : {}),
        ...(alert.model
          ? { model: { contains: alert.model, mode: "insensitive" } }
          : {}),
        ...(alert.fuelType ? { fuelType: alert.fuelType } : {}),
        ...(alert.minPrice || alert.maxPrice
          ? {
              price: {
                ...(alert.minPrice ? { gte: alert.minPrice } : {}),
                ...(alert.maxPrice ? { lte: alert.maxPrice } : {}),
              },
            }
          : {}),
        ...(activityFilters.length > 0 ? { OR: activityFilters } : {}),
      };
      const candidateCars =
        activityFilters.length > 0
          ? await prisma.car.findMany({
              where: carWhere,
              select: {
                id: true,
                slug: true,
                year: true,
                brand: true,
                model: true,
                price: true,
                createdAt: true,
                priceHistory: {
                  where: { recordedAt: { gt: since }, previousPrice: { not: null } },
                  orderBy: { recordedAt: "desc" },
                  take: 1,
                },
              },
              orderBy: { createdAt: "desc" },
              take: 25,
            })
          : [];
      const match = candidateCars.find((car) => {
        const isNewStock =
          wantsNewStock &&
          (alert.carId ? becameAvailable && car.id === alert.carId : car.createdAt > since);
        const latestPrice = car.priceHistory[0];
        const isPriceDrop =
          wantsPriceDrops &&
          latestPrice?.previousPrice !== null &&
          latestPrice?.previousPrice !== undefined &&
          Number(latestPrice.previousPrice) > Number(latestPrice.price);

        return isNewStock || isPriceDrop;
      });
      const observedState = {
        lastCheckedAt: now,
        ...(alert.carId ? { lastKnownCarStatus: currentWatchedStatus } : {}),
      };

      if (!match) {
        await prisma.stockAlert.updateMany({
          where: { id: alert.id, status: { in: ["ACTIVE", "MATCHED"] } },
          data: observedState,
        });
        counters.alertsChecked += 1;
        continue;
      }

      const carName = `${match.year} ${match.brand} ${match.model}`;
      const carUrl = `${siteUrl()}/cars/${match.slug}`;
      const unsubscribeUrl = `${siteUrl()}/alerts/unsubscribe?token=${encodeURIComponent(alert.unsubscribeToken)}`;
      const delivery =
        alert.channel === "EMAIL"
          ? await sendTransactionalEmail({
              to: alert.email,
              subject: `${carName} matches your ${dealerName()} alert`,
              idempotencyKey: `stock-alert-${alert.id}-${match.id}-${match.price.toString()}`,
              text: `${carName} is available for RM ${Number(match.price).toLocaleString("en-MY")}. View it at ${carUrl}\n\nStop this alert: ${unsubscribeUrl}`,
              html: `<h2>A vehicle matches your alert</h2><p><strong>${escapeHtml(carName)}</strong> is available for RM ${Number(match.price).toLocaleString("en-MY")}.</p><p><a href="${escapeHtml(carUrl)}">View the vehicle</a></p><p style="margin-top:24px;font-size:12px"><a href="${escapeHtml(unsubscribeUrl)}">Stop this alert</a></p>`,
            })
          : { delivered: false as const, reason: "not_configured" as const };

      if (alert.channel === "EMAIL" && !delivery.delivered) {
        const alreadyReported = await prisma.notification.findFirst({
          where: {
            type: "SYSTEM",
            title: { startsWith: "Alert email retry scheduled:" },
            entityType: "StockAlert",
            entityId: alert.id,
            createdAt: { gte: recentReminderCutoff },
          },
          select: { id: true },
        });
        await prisma.$transaction([
          prisma.stockAlert.updateMany({
            where: { id: alert.id, status: { in: ["ACTIVE", "MATCHED"] } },
            data: {
              lastCheckedAt: now,
              ...(!becameAvailable && alert.carId
                ? { lastKnownCarStatus: currentWatchedStatus }
                : {}),
            },
          }),
          ...(alreadyReported
            ? []
            : [
                prisma.notification.create({
                  data: {
                    type: "SYSTEM",
                    title: `Alert email retry scheduled: ${carName}`,
                    message: `${alert.email} matched, but email delivery failed. The match remains pending and will be retried.`,
                    actionUrl: "/admin?tab=growth&section=alerts",
                    entityType: "StockAlert",
                    entityId: alert.id,
                  },
                }),
              ]),
        ]);
        counters.alertsChecked += 1;
        counters.emailDeliveryFailures += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.stockAlert.updateMany({
          where: { id: alert.id, status: { in: ["ACTIVE", "MATCHED"] } },
          data: {
            ...observedState,
            lastMatchedAt: now,
            status: "MATCHED",
          },
        }),
        prisma.notification.create({
          data: {
            type: "ALERT_MATCHED",
            title: `Stock alert matched: ${carName}`,
            message: `${alert.channel === "EMAIL" ? alert.email : (alert.phone ?? alert.email)} · ${alert.channel}${delivery.delivered ? " · Sent" : " · Manual follow-up required"}`,
            actionUrl: `/cars/${match.slug}`,
            entityType: "StockAlert",
            entityId: alert.id,
          },
        }),
      ]);
      counters.alertsMatched += 1;
      counters.alertsChecked += 1;
      counters.emailsDelivered += delivery.delivered ? 1 : 0;
    } catch (error) {
      console.error(
        `Stock alert ${alert.id} could not be processed:`,
        error instanceof Error ? error.message : "Unknown processing error",
      );
      counters.alertErrors += 1;
      await prisma.stockAlert
        .updateMany({
          where: { id: alert.id, status: { in: ["ACTIVE", "MATCHED"] } },
          data: { lastCheckedAt: now },
        })
        .catch(() => undefined);
    }
  }

  return Response.json({ data: counters });
}

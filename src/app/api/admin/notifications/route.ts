import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { notificationQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = notificationQuerySchema.parse(Object.fromEntries(url.searchParams));
    const where = query.unreadOnly ? { readAt: null } : {};
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { readAt: null } })
    ]);

    return ok({ items, total, unreadCount });
  } catch (error) {
    return handleRouteError(error);
  }
}

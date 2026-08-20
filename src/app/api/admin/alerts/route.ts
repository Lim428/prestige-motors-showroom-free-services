import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { stockAlertAdminQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = stockAlertAdminQuerySchema.parse(Object.fromEntries(url.searchParams));
    const where = { status: query.status, type: query.type };
    const [items, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        include: {
          car: {
            select: {
              id: true,
              slug: true,
              brand: true,
              model: true,
              year: true,
              price: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: query.limit
      }),
      prisma.stockAlert.count({ where })
    ]);

    return ok({ items, total });
  } catch (error) {
    return handleRouteError(error);
  }
}

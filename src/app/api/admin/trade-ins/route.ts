import { Prisma } from "@prisma/client";
import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { tradeInAdminQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = tradeInAdminQuerySchema.parse(Object.fromEntries(url.searchParams));
    const where: Prisma.TradeInWhereInput = {
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
              { make: { contains: query.search, mode: "insensitive" as const } },
              { model: { contains: query.search, mode: "insensitive" as const } },
              { registration: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [items, total] = await Promise.all([
      prisma.tradeIn.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          lead: { select: { id: true, status: true } }
        },
        orderBy: { createdAt: "desc" },
        take: query.limit
      }),
      prisma.tradeIn.count({ where })
    ]);

    return ok({ items, total });
  } catch (error) {
    return handleRouteError(error);
  }
}

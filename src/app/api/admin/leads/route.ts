import { Prisma } from "@prisma/client";
import { handleRouteError, ok } from "@/lib/api";
import { adminLeadInclude, presentAdminLeads } from "@/lib/admin-leads";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { leadAdminQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = leadAdminQuerySchema.parse(Object.fromEntries(url.searchParams));
    const where: Prisma.LeadWhereInput = {
      status: query.status,
      source: query.source,
      priority: query.priority,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
              { phone: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: adminLeadInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: query.limit
      }),
      prisma.lead.count({ where })
    ]);
    const presentedItems = await presentAdminLeads(items);

    return ok(
      { items: presentedItems, total },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

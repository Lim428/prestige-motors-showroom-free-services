import { fail, handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { tradeInAdminUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = tradeInAdminUpdateSchema.parse(await request.json());
    const existing = await prisma.tradeIn.findUnique({
      where: { id },
      select: { id: true, leadId: true }
    });

    if (!existing) {
      return fail("Trade-in appraisal not found.", 404);
    }

    const tradeIn = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.tradeIn.update({
        where: { id },
        data: {
          status: payload.status,
          appraisalAmount: payload.appraisalAmount,
          adminNotes: payload.adminNotes
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          lead: { select: { id: true, status: true } }
        }
      });

      if (existing.leadId && payload.status === "ACCEPTED") {
        await transaction.lead.update({
          where: { id: existing.leadId },
          data: { status: "QUALIFIED", priority: "HIGH" }
        });
      }

      return updated;
    });

    return ok(tradeIn);
  } catch (error) {
    return handleRouteError(error);
  }
}

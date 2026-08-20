import { fail, handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { stockAlertAdminUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = stockAlertAdminUpdateSchema.parse(await request.json());
    const existing = await prisma.stockAlert.findUnique({
      where: { id },
      select: { id: true, status: true, verifiedAt: true }
    });

    if (!existing) {
      return fail("Stock alert not found.", 404);
    }

    if (existing.status === "UNSUBSCRIBED" && payload.status !== "UNSUBSCRIBED") {
      return fail("An unsubscribed alert cannot be reactivated without new customer consent.", 400);
    }

    if (payload.status === "PENDING_VERIFICATION" && existing.status !== payload.status) {
      return fail("A verified alert cannot be moved back to pending verification.", 400);
    }

    if (
      !existing.verifiedAt &&
      payload.status !== "PENDING_VERIFICATION" &&
      payload.status !== "UNSUBSCRIBED"
    ) {
      return fail("The customer must verify their email before this alert can be activated.", 400);
    }

    const alert = await prisma.stockAlert.update({
      where: { id },
      data: { status: payload.status },
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
      }
    });

    return ok(alert);
  } catch (error) {
    return handleRouteError(error);
  }
}

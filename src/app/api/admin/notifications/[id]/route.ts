import { fail, handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { notificationUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = notificationUpdateSchema.parse(await request.json());
    const existing = await prisma.notification.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      return fail("Notification not found.", 404);
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: payload.read ? new Date() : null }
    });

    return ok(notification);
  } catch (error) {
    return handleRouteError(error);
  }
}

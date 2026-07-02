import { fail, handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { enquiryUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const payload = enquiryUpdateSchema.parse(await request.json());
    const existing = await prisma.enquiry.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return fail("Enquiry not found.", 404);
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: { status: payload.status }
    });

    return ok(enquiry);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.enquiry.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return fail("Enquiry not found.", 404);
    }

    await prisma.enquiry.delete({
      where: { id }
    });

    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}

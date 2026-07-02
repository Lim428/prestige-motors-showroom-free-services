import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const enquiries = await prisma.enquiry.findMany({
      include: {
        car: {
          select: {
            id: true,
            slug: true,
            brand: true,
            model: true,
            year: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok(enquiries);
  } catch (error) {
    return handleRouteError(error);
  }
}

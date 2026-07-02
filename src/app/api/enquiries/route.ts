import { created, fail, handleRouteError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enquiryInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const payload = enquiryInputSchema.parse(await request.json());

    if (payload.carId) {
      const car = await prisma.car.findUnique({
        where: { id: payload.carId },
        select: { id: true }
      });

      if (!car) {
        return fail("Vehicle not found.", 404);
      }
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        message: payload.message,
        carId: payload.carId
      }
    });

    return created(enquiry);
  } catch (error) {
    return handleRouteError(error);
  }
}

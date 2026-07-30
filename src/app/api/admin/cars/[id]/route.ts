import { Prisma } from "@prisma/client";
import { fail, handleRouteError, ok } from "@/lib/api";
import { carInclude, serializeCar } from "@/lib/cars";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { createUniqueCarSlug } from "@/lib/slug";
import { carInputSchema, carStatusUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.car.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return fail("Vehicle not found.", 404);
    }

    const requestBody: unknown = await request.json();
    const statusUpdate = carStatusUpdateSchema.safeParse(requestBody);

    if (statusUpdate.success) {
      const car = await prisma.car.update({
        where: { id },
        data: {
          status: statusUpdate.data.status
        },
        include: carInclude
      });

      return ok(serializeCar(car));
    }

    const payload = carInputSchema.parse(requestBody);
    const slug = await createUniqueCarSlug({
      brand: payload.brand,
      model: payload.model,
      year: payload.year,
      currentCarId: id
    });

    const car = await prisma.car.update({
      where: { id },
      data: {
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        mileage: payload.mileage,
        transmission: payload.transmission,
        fuelType: payload.fuelType,
        engine: payload.engine,
        price: new Prisma.Decimal(payload.price),
        condition: payload.condition,
        description: payload.description,
        features: payload.features,
        status: payload.status,
        slug,
        images: {
          deleteMany: {},
          create: payload.images.map((image, index) => ({
            url: image.url,
            altText: image.altText,
            width: image.width,
            height: image.height,
            sortOrder: image.sortOrder ?? index
          }))
        }
      },
      include: carInclude
    });

    return ok(serializeCar(car));
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

    const existing = await prisma.car.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return fail("Vehicle not found.", 404);
    }

    await prisma.car.delete({
      where: { id }
    });

    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}

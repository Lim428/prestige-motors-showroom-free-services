import { Prisma } from "@prisma/client";
import { created, handleRouteError, ok } from "@/lib/api";
import { carInclude, serializeCar } from "@/lib/cars";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { createUniqueCarSlug } from "@/lib/slug";
import { carInputSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const cars = await prisma.car.findMany({
      include: carInclude,
      orderBy: { updatedAt: "desc" }
    });

    return ok(cars.map(serializeCar));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const payload = carInputSchema.parse(await request.json());
    const slug = await createUniqueCarSlug(payload);

    const car = await prisma.car.create({
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

    return created(serializeCar(car));
  } catch (error) {
    return handleRouteError(error);
  }
}

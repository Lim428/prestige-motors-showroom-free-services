import { Prisma } from "@prisma/client";
import { created, fail, handleRouteError, ok } from "@/lib/api";
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
        stockCode: payload.stockCode ?? null,
        brand: payload.brand,
        model: payload.model,
        variant: payload.variant ?? null,
        year: payload.year,
        registrationYear: payload.registrationYear ?? null,
        mileage: payload.mileage,
        bodyType: payload.bodyType ?? null,
        exteriorColor: payload.exteriorColor ?? null,
        interiorColor: payload.interiorColor ?? null,
        transmission: payload.transmission,
        fuelType: payload.fuelType,
        engine: payload.engine,
        engineCc: payload.engineCc ?? null,
        seats: payload.seats ?? null,
        doors: payload.doors ?? null,
        drivetrain: payload.drivetrain ?? null,
        assemblyType: payload.assemblyType ?? null,
        showroomLocation: payload.showroomLocation ?? null,
        price: new Prisma.Decimal(payload.price),
        condition: payload.condition,
        description: payload.description,
        features: payload.features,
        status: payload.status,
        isPublished: payload.isPublished,
        slug,
        priceHistory: {
          create: {
            price: new Prisma.Decimal(payload.price),
            reason: "Initial listing price"
          }
        },
        images: {
          create: payload.images.map((image, index) => ({
            url: image.url,
            publicId: image.publicId ?? null,
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("That stock code is already assigned to another vehicle.", 409);
    }

    return handleRouteError(error);
  }
}

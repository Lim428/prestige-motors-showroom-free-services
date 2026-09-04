import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { carInclude, serializeCar } from "@/lib/cars";
import { deleteImagesFromCloudinary } from "@/lib/cloudinary";
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
      select: {
        id: true,
        price: true,
        images: {
          select: { url: true, publicId: true }
        }
      }
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
    const nextPrice = new Prisma.Decimal(payload.price);
    const priceChanged = !existing.price.equals(nextPrice);
    const retainedImageUrls = new Set(payload.images.map((image) => image.url));
    const retainedPublicIds = new Set(
      payload.images
        .map((image) => image.publicId)
        .filter((publicId): publicId is string => Boolean(publicId))
    );
    const existingImageByUrl = new Map(existing.images.map((image) => [image.url, image]));
    const removedPublicIds = existing.images
      .filter(
        (image) =>
          !retainedImageUrls.has(image.url) &&
          (!image.publicId || !retainedPublicIds.has(image.publicId))
      )
      .map((image) => image.publicId)
      .filter((publicId): publicId is string => Boolean(publicId));
    const slug = await createUniqueCarSlug({
      brand: payload.brand,
      model: payload.model,
      year: payload.year,
      currentCarId: id
    });

    const car = await prisma.car.update({
      where: { id },
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
        price: nextPrice,
        condition: payload.condition,
        description: payload.description,
        features: payload.features,
        status: payload.status,
        isPublished: payload.isPublished,
        slug,
        priceHistory: priceChanged
          ? {
              create: {
                previousPrice: existing.price,
                price: nextPrice,
                reason: "Admin listing update"
              }
            }
          : undefined,
        images: {
          deleteMany: {},
          create: payload.images.map((image, index) => ({
            url: image.url,
            publicId:
              image.publicId ?? existingImageByUrl.get(image.url)?.publicId ?? null,
            altText: image.altText,
            width: image.width,
            height: image.height,
            sortOrder: image.sortOrder ?? index
          }))
        }
      },
      include: carInclude
    });

    if (removedPublicIds.length > 0) {
      after(() => deleteImagesFromCloudinary(removedPublicIds));
    }

    return ok(serializeCar(car));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("That stock code is already assigned to another vehicle.", 409);
    }

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
      select: {
        id: true,
        images: {
          select: { publicId: true }
        }
      }
    });

    if (!existing) {
      return fail("Vehicle not found.", 404);
    }

    await prisma.car.delete({
      where: { id }
    });

    const removedPublicIds = existing.images
      .map((image) => image.publicId)
      .filter((publicId): publicId is string => Boolean(publicId));

    if (removedPublicIds.length > 0) {
      after(() => deleteImagesFromCloudinary(removedPublicIds));
    }

    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}

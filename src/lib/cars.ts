import { cache } from "react";
import type { Car, CarImage, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { filterPreviewCars, previewCars } from "@/lib/preview-cars";
import type { CarQuery } from "@/lib/validators";

export type CarWithImages = Car & {
  images: CarImage[];
};

export type SerializedCarImage = Omit<CarImage, "createdAt"> & {
  createdAt: string;
};

export type SerializedCar = Omit<Car, "price" | "createdAt" | "updatedAt"> & {
  price: number;
  formattedPrice: string;
  createdAt: string;
  updatedAt: string;
  images: SerializedCarImage[];
};

export type ShowroomOffer = Pick<
  SerializedCar,
  "brand" | "mileage" | "model" | "price" | "status" | "variant" | "year"
>;

export const carInclude = {
  images: {
    orderBy: {
      sortOrder: "asc"
    }
  }
} satisfies Prisma.CarInclude;

export function serializeCar(car: CarWithImages): SerializedCar {
  const price = Number(car.price);

  return {
    ...car,
    price,
    formattedPrice: formatPrice(price),
    createdAt: car.createdAt.toISOString(),
    updatedAt: car.updatedAt.toISOString(),
    images: car.images.map((image) => ({
      ...image,
      createdAt: image.createdAt.toISOString()
    }))
  };
}

export function getPublicCarOrder(sort: CarQuery["sort"]): Prisma.CarOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "year-asc":
      return { year: "asc" };
    case "year-desc":
      return { year: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export function buildCarWhere(query: Partial<CarQuery>): Prisma.CarWhereInput {
  const where: Prisma.CarWhereInput = {
    isPublished: true
  };

  if (query.search) {
    where.OR = [
      { stockCode: { contains: query.search, mode: "insensitive" } },
      { brand: { contains: query.search, mode: "insensitive" } },
      { model: { contains: query.search, mode: "insensitive" } },
      { variant: { contains: query.search, mode: "insensitive" } },
      { bodyType: { contains: query.search, mode: "insensitive" } },
      { exteriorColor: { contains: query.search, mode: "insensitive" } },
      { interiorColor: { contains: query.search, mode: "insensitive" } },
      { engine: { contains: query.search, mode: "insensitive" } },
      { drivetrain: { contains: query.search, mode: "insensitive" } },
      { assemblyType: { contains: query.search, mode: "insensitive" } },
      { showroomLocation: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } }
    ];
  }

  if (query.brand) {
    where.brand = { equals: query.brand, mode: "insensitive" };
  }

  if (query.bodyType) {
    where.bodyType = { equals: query.bodyType, mode: "insensitive" };
  }

  if (query.fuel) {
    where.fuelType = query.fuel;
  }

  if (query.transmission) {
    where.transmission = query.transmission;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined && {
        gte: new PrismaNamespace.Decimal(query.minPrice)
      }),
      ...(query.maxPrice !== undefined && {
        lte: new PrismaNamespace.Decimal(query.maxPrice)
      })
    };
  }

  if (query.minYear !== undefined || query.maxYear !== undefined) {
    where.year = {
      ...(query.minYear !== undefined && { gte: query.minYear }),
      ...(query.maxYear !== undefined && { lte: query.maxYear })
    };
  }

  if (query.maxMileage !== undefined) {
    where.mileage = { lte: query.maxMileage };
  }

  return where;
}

export async function getCars(query: CarQuery) {
  if (process.env.SHOWROOM_PREVIEW === "true") {
    return filterPreviewCars(query);
  }

  const cars = await prisma.car.findMany({
    where: buildCarWhere(query),
    include: carInclude,
    orderBy: [getPublicCarOrder(query.sort), { createdAt: "desc" }]
  });

  return cars.map(serializeCar);
}

export async function getShowroomSummary(query: CarQuery): Promise<{
  availableCount: number;
  offers: ShowroomOffer[];
}> {
  if (process.env.SHOWROOM_PREVIEW === "true") {
    const showroomCars = filterPreviewCars(query);

    return {
      availableCount: showroomCars.filter((car) => car.status === "AVAILABLE").length,
      offers: showroomCars.slice(0, 12).map(
        ({ brand, mileage, model, price, status, variant, year }) => ({
          brand,
          mileage,
          model,
          price,
          status,
          variant,
          year
        })
      )
    };
  }

  const where = buildCarWhere(query);
  const [availableCount, offers] = await Promise.all([
    prisma.car.count({
      where: {
        ...where,
        status: "AVAILABLE"
      }
    }),
    prisma.car.findMany({
      where,
      select: {
        brand: true,
        mileage: true,
        model: true,
        price: true,
        status: true,
        variant: true,
        year: true
      },
      orderBy: [getPublicCarOrder(query.sort), { createdAt: "desc" }],
      take: 12
    })
  ]);

  return {
    availableCount,
    offers: offers.map((offer) => ({
      ...offer,
      price: Number(offer.price)
    }))
  };
}

export const getCarBySlugOrId = cache(async function getCarBySlugOrId(value: string) {
  if (process.env.SHOWROOM_PREVIEW === "true") {
    return previewCars.find((car) => car.slug === value || car.id === value) ?? null;
  }

  const car = await prisma.car.findFirst({
    where: {
      isPublished: true,
      OR: [{ slug: value }, { id: value }]
    },
    include: carInclude
  });

  return car ? serializeCar(car) : null;
});

export async function getRelatedCars(car: SerializedCar, take = 3) {
  if (process.env.SHOWROOM_PREVIEW === "true") {
    return previewCars.filter((item) => item.id !== car.id).slice(0, take);
  }

  const related = await prisma.car.findMany({
    where: {
      id: { not: car.id },
      isPublished: true,
      status: { not: "SOLD" },
      OR: [
        { brand: car.brand },
        { fuelType: car.fuelType },
        { transmission: car.transmission }
      ]
    },
    include: carInclude,
    orderBy: [{ createdAt: "desc" }],
    take
  });

  return related.map(serializeCar);
}

export async function getFilterOptions() {
  if (process.env.SHOWROOM_PREVIEW === "true") {
    const years = previewCars.map((car) => car.year);
    const prices = previewCars.map((car) => car.price);

    return {
      brands: [...new Set(previewCars.map((car) => car.brand))].sort(),
      bodyTypes: [...new Set(previewCars.flatMap((car) => (car.bodyType ? [car.bodyType] : [])))].sort(),
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices)
    };
  }

  const [brands, bodyTypes, years] = await Promise.all([
    prisma.car.findMany({
      where: { isPublished: true },
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" }
    }),
    prisma.car.findMany({
      where: {
        isPublished: true,
        bodyType: { not: null }
      },
      distinct: ["bodyType"],
      select: { bodyType: true },
      orderBy: { bodyType: "asc" }
    }),
    prisma.car.aggregate({
      where: { isPublished: true },
      _min: { year: true, price: true },
      _max: { year: true, price: true }
    })
  ]);

  return {
    brands: brands.map((item) => item.brand),
    bodyTypes: bodyTypes.flatMap((item) =>
      item.bodyType === null ? [] : [item.bodyType]
    ),
    minYear: years._min.year,
    maxYear: years._max.year,
    minPrice: years._min.price ? Number(years._min.price) : null,
    maxPrice: years._max.price ? Number(years._max.price) : null
  };
}

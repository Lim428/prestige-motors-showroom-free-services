import type { Car, CarImage, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
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
  const where: Prisma.CarWhereInput = {};

  if (query.search) {
    where.OR = [
      { brand: { contains: query.search, mode: "insensitive" } },
      { model: { contains: query.search, mode: "insensitive" } },
      { engine: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } }
    ];
  }

  if (query.brand) {
    where.brand = { equals: query.brand, mode: "insensitive" };
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

  return where;
}

export async function getCars(query: CarQuery) {
  const cars = await prisma.car.findMany({
    where: buildCarWhere(query),
    include: carInclude,
    orderBy: [getPublicCarOrder(query.sort), { createdAt: "desc" }]
  });

  return cars.map(serializeCar);
}

export async function getCarBySlugOrId(value: string) {
  const car = await prisma.car.findFirst({
    where: {
      OR: [{ slug: value }, { id: value }]
    },
    include: carInclude
  });

  return car ? serializeCar(car) : null;
}

export async function getRelatedCars(car: SerializedCar, take = 3) {
  const related = await prisma.car.findMany({
    where: {
      id: { not: car.id },
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
  const [brands, years] = await Promise.all([
    prisma.car.findMany({
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" }
    }),
    prisma.car.aggregate({
      _min: { year: true, price: true },
      _max: { year: true, price: true }
    })
  ]);

  return {
    brands: brands.map((item) => item.brand),
    minYear: years._min.year,
    maxYear: years._max.year,
    minPrice: years._min.price ? Number(years._min.price) : null,
    maxPrice: years._max.price ? Number(years._max.price) : null
  };
}

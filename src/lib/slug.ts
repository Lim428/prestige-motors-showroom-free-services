import { prisma } from "@/lib/prisma";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createUniqueCarSlug(input: {
  brand: string;
  model: string;
  year: number;
  currentCarId?: string;
}) {
  const base = slugify(`${input.year} ${input.brand} ${input.model}`);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.car.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!existing || existing.id === input.currentCarId) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

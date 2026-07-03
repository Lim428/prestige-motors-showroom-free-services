import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl();
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${url}/#inventory`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    }
  ];

  if (!process.env.DATABASE_URL) {
    return baseEntries;
  }

  try {
    const cars = await prisma.car.findMany({
      select: {
        slug: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return [
      ...baseEntries,
      ...cars.map((car) => ({
        url: `${url}/cars/${car.slug}`,
        lastModified: car.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8
      }))
    ];
  } catch (error) {
    console.error("Sitemap inventory load failed:", error);
    return baseEntries;
  }
}

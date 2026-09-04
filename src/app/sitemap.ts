import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl();
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${url}/compare`,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${url}/book-test-drive`,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${url}/trade-in`,
      changeFrequency: "monthly",
      priority: 0.7
    }
  ];

  if (
    process.env.SKIP_SITEMAP_DB === "true" ||
    !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")
  ) {
    return baseEntries;
  }

  try {
    const cars = await prisma.car.findMany({
      where: {
        isPublished: true
      },
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

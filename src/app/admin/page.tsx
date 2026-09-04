import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import type { AdminTab } from "@/components/admin/AdminDashboard";
import type { GrowthSection } from "@/components/admin/growth/AdminGrowthHub";
import { authOptions } from "@/lib/auth";
import { carInclude, serializeCar } from "@/lib/cars";
import { prisma } from "@/lib/prisma";
import type { AdminEnquiry } from "@/types/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.adminDashboard");
  return {
    title: t("title"),
    robots: { index: false, follow: false }
  };
}

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const adminTabs = new Set<AdminTab>(["inventory", "enquiries", "growth"]);
const growthSections = new Set<GrowthSection>([
  "leads",
  "appointments",
  "trade-ins",
  "alerts",
  "analytics",
  "trust-packs"
]);

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const resolvedSearchParams = await searchParams;
  const requestedTab = firstValue(resolvedSearchParams.tab) as AdminTab | undefined;
  const requestedSection = firstValue(resolvedSearchParams.section) as
    | GrowthSection
    | undefined;
  const initialTab = requestedTab && adminTabs.has(requestedTab) ? requestedTab : "inventory";
  const initialGrowthSection =
    requestedSection && growthSections.has(requestedSection) ? requestedSection : "leads";

  const [cars, enquiries] = await Promise.all([
    prisma.car.findMany({
      include: carInclude,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.enquiry.findMany({
      include: {
        car: {
          select: {
            id: true,
            slug: true,
            brand: true,
            model: true,
            year: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const serializedEnquiries: AdminEnquiry[] = enquiries.map((enquiry) => ({
    ...enquiry,
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString()
  }));

  return (
    <AdminDashboard
      initialCars={cars.map(serializeCar)}
      initialEnquiries={serializedEnquiries}
      initialTab={initialTab}
      initialGrowthSection={initialGrowthSection}
      adminId={session.user.id}
      adminName={session.user.name ?? session.user.email ?? "Administrator"}
    />
  );
}

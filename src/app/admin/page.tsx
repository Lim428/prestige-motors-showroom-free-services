import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { authOptions } from "@/lib/auth";
import { carInclude, serializeCar } from "@/lib/cars";
import { prisma } from "@/lib/prisma";
import type { AdminEnquiry } from "@/types/admin";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    redirect("/admin/login");
  }

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
      adminName={session.user.name ?? session.user.email ?? "Administrator"}
    />
  );
}

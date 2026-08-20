import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const adminLeadInclude = {
  car: {
    select: { id: true, slug: true, brand: true, model: true, year: true }
  },
  assignedTo: { select: { id: true, name: true, email: true } },
  notes: {
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 10
  }
} satisfies Prisma.LeadInclude;

type AdminLeadRecord = Prisma.LeadGetPayload<{
  include: typeof adminLeadInclude;
}>;

type SafeTranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

function safeTranscript(value: unknown): SafeTranscriptMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 50).flatMap((message) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return [];
    }

    const role = Reflect.get(message, "role");
    const content = Reflect.get(message, "content");
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string"
    ) {
      return [];
    }

    const normalizedContent = content.trim().slice(0, 1200);
    return normalizedContent ? [{ role, content: normalizedContent }] : [];
  });
}

function referencedVehicleIds(lead: AdminLeadRecord) {
  return [
    ...new Set([
      ...lead.preferredCarIds,
      ...(lead.car ? [lead.car.id] : [])
    ])
  ];
}

export async function presentAdminLeads(leads: AdminLeadRecord[]) {
  const vehicleIds = [
    ...new Set(leads.flatMap((lead) => referencedVehicleIds(lead)))
  ];
  const vehicles = vehicleIds.length
    ? await prisma.car.findMany({
        where: { id: { in: vehicleIds } },
        select: {
          id: true,
          slug: true,
          brand: true,
          model: true,
          year: true,
          status: true
        }
      })
    : [];
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return leads.map((lead) => ({
    ...lead,
    transcript: safeTranscript(lead.transcript),
    preferredVehicles: referencedVehicleIds(lead).map((id) => {
      const vehicle = vehicleById.get(id);
      return vehicle
        ? { ...vehicle, missing: false as const }
        : {
            id,
            slug: null,
            brand: null,
            model: null,
            year: null,
            status: null,
            missing: true as const
          };
    })
  }));
}

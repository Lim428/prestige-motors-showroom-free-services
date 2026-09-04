import { fail, handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hasVerifiedTrustEvidence } from "@/lib/trust-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const car = await prisma.car.findFirst({
      where: { isPublished: true, OR: [{ id }, { slug: id }] },
      select: {
        id: true,
        slug: true,
        brand: true,
        model: true,
        year: true,
        trustProfile: {
          select: {
            inspectionStatus: true,
            inspectionScore: true,
            inspectionSummary: true,
            serviceHistorySummary: true,
            warrantyMonths: true,
            warrantyProvider: true,
            ownershipCount: true,
            accidentFree: true,
            lastInspectedAt: true,
            reportUrl: true,
            updatedAt: true
          }
        },
        trustDocuments: {
          where: { verified: true },
          select: {
            id: true,
            category: true,
            title: true,
            url: true,
            issuedAt: true,
            expiresAt: true,
            verified: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!car) {
      return fail("Vehicle not found.", 404);
    }

    const { trustProfile: profile, trustDocuments: documents, ...vehicle } = car;
    const publicProfile =
      profile?.inspectionStatus === "VERIFIED" &&
      !hasVerifiedTrustEvidence(profile, documents)
        ? { ...profile, inspectionStatus: "IN_PROGRESS" as const }
        : profile;

    return ok({ car: vehicle, profile: publicProfile, documents });
  } catch (error) {
    return handleRouteError(error);
  }
}

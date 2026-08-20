import { fail, handleRouteError, ok } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { verifiedTrustEvidenceIssues } from "@/lib/trust-evidence";
import { vehicleTrustInputSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findCar(id: string) {
  return prisma.car.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, slug: true, brand: true, model: true, year: true }
  });
}

async function trustPack(carId: string) {
  const [profile, documents] = await Promise.all([
    prisma.vehicleTrustProfile.findUnique({ where: { carId } }),
    prisma.trustDocument.findMany({
      where: { carId },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return { profile, documents };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const car = await findCar(id);

    if (!car) {
      return fail("Vehicle not found.", 404);
    }

    return ok({ car, ...(await trustPack(car.id)) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = vehicleTrustInputSchema.parse(await request.json());
    const car = await findCar(id);

    if (!car) {
      return fail("Vehicle not found.", 404);
    }

    const { documents, ...profile } = payload;
    await prisma.$transaction(async (transaction) => {
      const [existingProfile, existingDocuments] = await Promise.all([
        transaction.vehicleTrustProfile.findUnique({ where: { carId: car.id } }),
        transaction.trustDocument.findMany({
          where: { carId: car.id },
          select: { verified: true, title: true, url: true }
        })
      ]);
      const effectiveStatus =
        profile.inspectionStatus ?? existingProfile?.inspectionStatus ?? "NOT_INSPECTED";
      const effectiveSummary =
        profile.inspectionSummary !== undefined
          ? profile.inspectionSummary
          : existingProfile?.inspectionSummary;
      const effectiveLastInspectedAt =
        profile.lastInspectedAt !== undefined
          ? profile.lastInspectedAt
          : existingProfile?.lastInspectedAt;
      const effectiveDocuments = documents ?? existingDocuments;

      if (effectiveStatus === "VERIFIED") {
        const issues = verifiedTrustEvidenceIssues(
          {
            inspectionSummary: effectiveSummary,
            lastInspectedAt: effectiveLastInspectedAt
          },
          effectiveDocuments
        );

        if (issues.length > 0) {
          throw new HttpError(
            422,
            `Verified trust packs require ${issues.join(", ")}. Add the evidence or save the profile as In progress.`
          );
        }
      }

      await transaction.vehicleTrustProfile.upsert({
        where: { carId: car.id },
        create: {
          carId: car.id,
          inspectionStatus: profile.inspectionStatus,
          inspectionScore: profile.inspectionScore,
          inspectionSummary: profile.inspectionSummary,
          serviceHistorySummary: profile.serviceHistorySummary,
          warrantyMonths: profile.warrantyMonths,
          warrantyProvider: profile.warrantyProvider,
          ownershipCount: profile.ownershipCount,
          accidentFree: profile.accidentFree,
          lastInspectedAt:
            profile.lastInspectedAt === undefined || profile.lastInspectedAt === null
              ? profile.lastInspectedAt
              : new Date(profile.lastInspectedAt),
          reportUrl: profile.reportUrl
        },
        update: {
          inspectionStatus: profile.inspectionStatus,
          inspectionScore: profile.inspectionScore,
          inspectionSummary: profile.inspectionSummary,
          serviceHistorySummary: profile.serviceHistorySummary,
          warrantyMonths: profile.warrantyMonths,
          warrantyProvider: profile.warrantyProvider,
          ownershipCount: profile.ownershipCount,
          accidentFree: profile.accidentFree,
          lastInspectedAt:
            profile.lastInspectedAt === undefined || profile.lastInspectedAt === null
              ? profile.lastInspectedAt
              : new Date(profile.lastInspectedAt),
          reportUrl: profile.reportUrl
        }
      });

      if (documents !== undefined) {
        await transaction.trustDocument.deleteMany({ where: { carId: car.id } });
        if (documents.length) {
          await transaction.trustDocument.createMany({
            data: documents.map((document) => ({
              carId: car.id,
              category: document.category,
              title: document.title,
              url: document.url,
              issuedAt: document.issuedAt ? new Date(document.issuedAt) : null,
              expiresAt: document.expiresAt ? new Date(document.expiresAt) : null,
              verified: document.verified
            }))
          });
        }
      }
    });

    return ok({ car, ...(await trustPack(car.id)) });
  } catch (error) {
    return handleRouteError(error);
  }
}

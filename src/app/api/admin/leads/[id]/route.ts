import { Prisma } from "@prisma/client";
import { fail, handleRouteError, ok } from "@/lib/api";
import { adminLeadInclude, presentAdminLeads } from "@/lib/admin-leads";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { leadAdminUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const payload = leadAdminUpdateSchema.parse(await request.json());
    const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      return fail("Lead not found.", 404);
    }

    if (payload.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: payload.assignedToId, role: "ADMIN" },
        select: { id: true }
      });
      if (!assignee) {
        return fail("Assigned administrator not found.", 404);
      }
    }

    const lead = await prisma.$transaction(async (transaction) => {
      const data: Prisma.LeadUncheckedUpdateInput = {
        status: payload.status,
        priority: payload.priority,
        assignedToId: payload.assignedToId,
        nextFollowUpAt:
          payload.nextFollowUpAt === undefined
            ? undefined
            : payload.nextFollowUpAt === null
              ? null
              : new Date(payload.nextFollowUpAt),
        summary: payload.summary
      };
      const updated = await transaction.lead.update({
        where: { id },
        data,
        include: adminLeadInclude
      });

      if (payload.note) {
        await transaction.leadNote.create({
          data: {
            leadId: id,
            authorId: session.user.id,
            content: payload.note
          }
        });

        return transaction.lead.findUniqueOrThrow({
          where: { id },
          include: adminLeadInclude
        });
      }

      return updated;
    });
    const [presentedLead] = await presentAdminLeads([lead]);

    return ok(presentedLead, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

import type { NotificationType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationDatabase = Pick<PrismaClient, "notification"> | Prisma.TransactionClient;

type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
};

export async function createAdminNotification(
  input: NotificationInput,
  database: NotificationDatabase = prisma
) {
  return database.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      entityType: input.entityType,
      entityId: input.entityId
    }
  });
}

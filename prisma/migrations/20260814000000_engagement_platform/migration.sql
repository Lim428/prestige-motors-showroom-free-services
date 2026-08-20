-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'CONTACTED', 'APPOINTMENT_SET', 'NEGOTIATING', 'WON', 'LOST', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('AI_ASSISTANT', 'WEBSITE', 'WHATSAPP', 'ENQUIRY', 'TEST_DRIVE', 'TRADE_IN', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('TEST_DRIVE', 'SHOWROOM_VISIT', 'VIDEO_CALL');

-- CreateEnum
CREATE TYPE "TradeInStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'APPRAISED', 'ACCEPTED', 'DECLINED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PRICE_DROP', 'NEW_STOCK', 'BOTH');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'PAUSED', 'MATCHED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_LEAD', 'APPOINTMENT_REQUEST', 'TRADE_IN_SUBMITTED', 'STOCK_ALERT_CREATED', 'FOLLOW_UP_DUE', 'ALERT_MATCHED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AnalyticsEventName" AS ENUM ('PAGE_VIEW', 'VEHICLE_VIEW', 'WHATSAPP_CLICK', 'PHONE_CLICK', 'GALLERY_INTERACTION', 'ENQUIRY_SUBMITTED', 'AI_CHAT_STARTED', 'AI_LEAD_CAPTURED', 'FINANCE_CALCULATED', 'COMPARE_USED', 'CAR_SAVED', 'TEST_DRIVE_BOOKED', 'TRADE_IN_SUBMITTED', 'STOCK_ALERT_CREATED', 'TRUST_REPORT_DOWNLOADED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('NOT_INSPECTED', 'IN_PROGRESS', 'VERIFIED', 'NEEDS_ATTENTION');

-- CreateEnum
CREATE TYPE "TrustDocumentCategory" AS ENUM ('INSPECTION_REPORT', 'SERVICE_RECORD', 'WARRANTY', 'CERTIFICATE', 'OTHER');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
    "summary" TEXT,
    "transcript" JSONB,
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "preferredCarIds" TEXT[],
    "nextFollowUpAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3) NOT NULL,
    "carId" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'TEST_DRIVE',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "carId" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeIn" (
    "id" TEXT NOT NULL,
    "status" "TradeInStatus" NOT NULL DEFAULT 'SUBMITTED',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "registration" TEXT,
    "condition" TEXT NOT NULL,
    "expectedPrice" DECIMAL(12,2),
    "appraisalAmount" DECIMAL(12,2),
    "notes" TEXT,
    "adminNotes" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeInImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tradeInId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeInImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "channel" "AlertChannel" NOT NULL DEFAULT 'EMAIL',
    "type" "AlertType" NOT NULL DEFAULT 'NEW_STOCK',
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "brand" TEXT,
    "model" TEXT,
    "fuelType" "FuelType",
    "minPrice" DECIMAL(12,2),
    "maxPrice" DECIMAL(12,2),
    "consentAt" TIMESTAMP(3) NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "lastMatchedAt" TIMESTAMP(3),
    "carId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" "AnalyticsEventName" NOT NULL,
    "sessionId" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "metadata" JSONB,
    "carId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "previousPrice" DECIMAL(12,2),
    "price" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "carId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTrustProfile" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "inspectionStatus" "InspectionStatus" NOT NULL DEFAULT 'NOT_INSPECTED',
    "inspectionScore" INTEGER,
    "inspectionSummary" TEXT,
    "serviceHistorySummary" TEXT,
    "warrantyMonths" INTEGER,
    "warrantyProvider" TEXT,
    "ownershipCount" INTEGER,
    "accidentFree" BOOLEAN,
    "lastInspectedAt" TIMESTAMP(3),
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTrustProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustDocument" (
    "id" TEXT NOT NULL,
    "category" "TrustDocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "carId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_priority_createdAt_idx" ON "Lead"("priority", "createdAt");
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_carId_idx" ON "Lead"("carId");
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");
CREATE INDEX "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");
CREATE INDEX "LeadNote_authorId_idx" ON "LeadNote"("authorId");
CREATE INDEX "Appointment_startAt_status_idx" ON "Appointment"("startAt", "status");
CREATE INDEX "Appointment_carId_startAt_idx" ON "Appointment"("carId", "startAt");
CREATE INDEX "Appointment_leadId_idx" ON "Appointment"("leadId");
CREATE INDEX "Appointment_email_idx" ON "Appointment"("email");
CREATE INDEX "TradeIn_status_createdAt_idx" ON "TradeIn"("status", "createdAt");
CREATE INDEX "TradeIn_email_idx" ON "TradeIn"("email");
CREATE INDEX "TradeIn_leadId_idx" ON "TradeIn"("leadId");
CREATE INDEX "TradeInImage_tradeInId_sortOrder_idx" ON "TradeInImage"("tradeInId", "sortOrder");
CREATE UNIQUE INDEX "StockAlert_verificationToken_key" ON "StockAlert"("verificationToken");
CREATE UNIQUE INDEX "StockAlert_unsubscribeToken_key" ON "StockAlert"("unsubscribeToken");
CREATE INDEX "StockAlert_status_type_idx" ON "StockAlert"("status", "type");
CREATE INDEX "StockAlert_email_idx" ON "StockAlert"("email");
CREATE INDEX "StockAlert_carId_idx" ON "StockAlert"("carId");
CREATE INDEX "StockAlert_brand_model_idx" ON "StockAlert"("brand", "model");
CREATE INDEX "Notification_readAt_createdAt_idx" ON "Notification"("readAt", "createdAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");
CREATE INDEX "AnalyticsEvent_carId_event_createdAt_idx" ON "AnalyticsEvent"("carId", "event", "createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "PriceHistory_carId_recordedAt_idx" ON "PriceHistory"("carId", "recordedAt");
CREATE UNIQUE INDEX "VehicleTrustProfile_carId_key" ON "VehicleTrustProfile"("carId");
CREATE INDEX "VehicleTrustProfile_inspectionStatus_idx" ON "VehicleTrustProfile"("inspectionStatus");
CREATE INDEX "TrustDocument_carId_category_idx" ON "TrustDocument"("carId", "category");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TradeIn" ADD CONSTRAINT "TradeIn_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TradeInImage" ADD CONSTRAINT "TradeInImage_tradeInId_fkey" FOREIGN KEY ("tradeInId") REFERENCES "TradeIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTrustProfile" ADD CONSTRAINT "VehicleTrustProfile_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrustDocument" ADD CONSTRAINT "TrustDocument_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockAlert"
ADD COLUMN "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastKnownCarStatus" "CarStatus";

UPDATE "StockAlert"
SET "verifiedAt" = "createdAt"
WHERE "status" <> 'PENDING_VERIFICATION';

ALTER TABLE "StockAlert"
ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

CREATE INDEX "StockAlert_status_lastCheckedAt_idx"
ON "StockAlert"("status", "lastCheckedAt");

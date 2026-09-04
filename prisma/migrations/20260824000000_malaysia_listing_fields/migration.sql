-- Extend vehicle inventory with structured Malaysian dealer listing fields.
-- Existing listings remain publicly visible through the NOT NULL default.
ALTER TABLE "Car"
ADD COLUMN "stockCode" TEXT,
ADD COLUMN "variant" TEXT,
ADD COLUMN "registrationYear" INTEGER,
ADD COLUMN "bodyType" TEXT,
ADD COLUMN "exteriorColor" TEXT,
ADD COLUMN "interiorColor" TEXT,
ADD COLUMN "engineCc" INTEGER,
ADD COLUMN "seats" INTEGER,
ADD COLUMN "doors" INTEGER,
ADD COLUMN "drivetrain" TEXT,
ADD COLUMN "assemblyType" TEXT,
ADD COLUMN "showroomLocation" TEXT,
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- Preserve existing listings as public, but make every future listing a draft
-- until an administrator explicitly publishes it.
ALTER TABLE "Car"
ALTER COLUMN "isPublished" SET DEFAULT false;

ALTER TABLE "CarImage"
ADD COLUMN "publicId" TEXT;

CREATE UNIQUE INDEX "Car_stockCode_key" ON "Car"("stockCode");
CREATE INDEX "Car_isPublished_status_idx" ON "Car"("isPublished", "status");
CREATE INDEX "Car_bodyType_idx" ON "Car"("bodyType");
CREATE INDEX "Car_showroomLocation_idx" ON "Car"("showroomLocation");

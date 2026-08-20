CREATE TABLE "ApiRateLimit" (
    "key" VARCHAR(128) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "ApiRateLimit_resetAt_idx" ON "ApiRateLimit"("resetAt");

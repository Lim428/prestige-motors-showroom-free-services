import { createHmac } from "node:crypto";
import { HttpError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type RateLimitHeaders = Headers | Record<string, unknown>;

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  message?: string;
};

function headerValue(headers: RateLimitHeaders, name: string) {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }

  const entry = Object.entries(headers).find(
    ([headerName]) => headerName.toLowerCase() === name
  )?.[1];

  if (Array.isArray(entry)) {
    return typeof entry[0] === "string" ? entry[0] : undefined;
  }

  return typeof entry === "string" ? entry : undefined;
}

function firstAddress(value: string | undefined) {
  return value?.split(",")[0]?.trim().toLowerCase() || undefined;
}

export function trustedClientAddress(headers: RateLimitHeaders) {
  return (
    firstAddress(headerValue(headers, "x-vercel-forwarded-for")) ??
    firstAddress(headerValue(headers, "x-forwarded-for")) ??
    firstAddress(headerValue(headers, "x-real-ip")) ??
    "unknown"
  );
}

function rateLimitSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for privacy-safe rate limiting.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (secret.length < 32 || secret.startsWith("replace-with-"))
  ) {
    throw new Error(
      "NEXTAUTH_SECRET must be a unique production secret of at least 32 characters."
    );
  }

  return secret;
}

export function buildRateLimitKey(bucket: string, identity: readonly string[]) {
  const digest = createHmac("sha256", rateLimitSecret())
    .update(JSON.stringify(identity.map((part) => part.trim().toLowerCase())))
    .digest("hex");

  return `${bucket}:${digest}`;
}

export async function enforceRateLimit(
  request: Request,
  bucket: string,
  options: RateLimitOptions
) {
  return enforceRateLimitForIdentity(
    bucket,
    [trustedClientAddress(request.headers)],
    options
  );
}

export async function enforceRateLimitForIdentity(
  bucket: string,
  identity: readonly string[],
  options: RateLimitOptions
) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowMs);
  const key = buildRateLimitKey(bucket, identity);
  const [entry] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "ApiRateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "ApiRateLimit"."resetAt" <= ${now} THEN 1
        ELSE "ApiRateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "ApiRateLimit"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "ApiRateLimit"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  if (!entry) {
    throw new Error("Rate limit could not be evaluated.");
  }

  if (entry.count > options.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1_000)
    );

    throw new HttpError(
      429,
      options.message ?? "Too many requests. Please wait and try again.",
      {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(entry.resetAt.getTime() / 1_000))
      }
    );
  }
}

export async function resetRateLimitForIdentity(
  bucket: string,
  identity: readonly string[]
) {
  await prisma.apiRateLimit.deleteMany({
    where: { key: buildRateLimitKey(bucket, identity) }
  });
}

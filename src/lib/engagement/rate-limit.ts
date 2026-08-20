import { createHash } from "node:crypto";
import { HttpError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

function requestAddress(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function enforceRateLimit(
  request: Request,
  bucket: string,
  options: { limit: number; windowMs: number }
) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowMs);
  const addressDigest = createHash("sha256")
    .update(`${process.env.NEXTAUTH_SECRET ?? "local"}:${requestAddress(request)}`)
    .digest("hex");
  const key = `${bucket}:${addressDigest}`;
  const [entry] = await prisma.$queryRaw<Array<{ count: number }>>`
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
    RETURNING "count"
  `;

  if (entry && entry.count > options.limit) {
    throw new HttpError(429, "Too many requests. Please wait and try again.");
  }
}

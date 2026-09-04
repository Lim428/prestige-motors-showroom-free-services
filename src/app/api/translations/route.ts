import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { translateInterfaceTexts } from "@/lib/interface-translations";
import { instantTranslations } from "@/i18n/instant-translations";
import { sourceCatalog } from "@/i18n/source-catalog.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSourceText = new Set<string>(sourceCatalog);
const requestSchema = z
  .object({
    locale: z.enum(["ms", "zh"]),
    texts: z.array(z.string().trim().min(2).max(800)).min(1).max(60)
  })
  .superRefine((value, context) => {
    const totalCharacters = value.texts.reduce((total, text) => total + text.length, 0);

    if (totalCharacters > 10_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The translation batch is too large."
      });
    }

    for (const text of value.texts) {
      if (!allowedSourceText.has(text)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only registered interface copy can be translated."
        });
        break;
      }
    }
  });

const windowMs = 60_000;
const maxRequests = 15;
const maxBuckets = 5_000;
const maxCacheEntries = 8_000;
const buckets = new Map<string, { count: number; resetAt: number }>();
const cache = new Map<string, string>();
let lastCleanupAt = 0;

for (const locale of ["ms", "zh"] as const) {
  for (const [source, translation] of Object.entries(instantTranslations[locale] ?? {})) {
    cache.set(cacheKey(locale, source), translation);
  }
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);

    if (!allowRequest(ip)) {
      return fail("Please wait before requesting more interface translations.", 429);
    }

    const payload = requestSchema.parse(await request.json());
    const uniqueTexts = [...new Set(payload.texts)];
    const missingTexts = uniqueTexts.filter(
      (text) => !cache.has(cacheKey(payload.locale, text))
    );

    if (missingTexts.length > 0) {
      const translated = await translateInterfaceTexts(missingTexts, payload.locale);

      missingTexts.forEach((text, index) => {
        if (cache.size >= maxCacheEntries) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) cache.delete(oldestKey);
        }

        const candidate = translated[index]?.trim();
        cache.set(
          cacheKey(payload.locale, text),
          candidate && placeholderCount(candidate) === placeholderCount(text)
            ? candidate
            : text
        );
      });
    }

    return ok({
      translations: payload.texts.map(
        (text) => cache.get(cacheKey(payload.locale, text)) ?? text
      )
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function cacheKey(locale: string, text: string) {
  return `${locale}\u0000${text}`;
}

function placeholderCount(value: string) {
  return value.match(/\{value\}/g)?.length ?? 0;
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function allowRequest(key: string) {
  const now = Date.now();

  if (now - lastCleanupAt >= windowMs) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    lastCleanupAt = now;
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) return false;
  bucket.count += 1;
  return true;
}

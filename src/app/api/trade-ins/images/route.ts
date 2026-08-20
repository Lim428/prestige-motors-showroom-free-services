import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/engagement/rate-limit";
import { HttpError } from "@/lib/errors";
import { optimizeAndSaveImages } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxImagesPerRequest = 1;
const maxBytesPerImage = 4 * 1024 * 1024;

export async function GET() {
  return ok({
    method: "POST",
    contentType: "multipart/form-data",
    fields: ["images", "file"],
    maxImagesPerRequest,
    maxBytesPerImage,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"]
  });
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "trade-in-image", { limit: 12, windowMs: 10 * 60_000 });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > maxBytesPerImage + 128 * 1024) {
      return fail("The image upload is too large.", 413);
    }

    const formData = await request.formData();
    const files = [...formData.getAll("images"), ...formData.getAll("file")].filter(
      (item): item is File => item instanceof File && item.size > 0
    );

    if (files.length > maxImagesPerRequest) {
      throw new HttpError(422, "Upload trade-in photos one at a time.");
    }

    const images = await optimizeAndSaveImages(files);
    return ok({ images });
  } catch (error) {
    return handleRouteError(error);
  }
}

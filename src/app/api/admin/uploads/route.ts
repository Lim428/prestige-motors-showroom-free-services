import { handleRouteError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/security";
import { optimizeAndSaveImages } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const files = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File);
    const images = await optimizeAndSaveImages(files);

    return ok(images);
  } catch (error) {
    return handleRouteError(error);
  }
}

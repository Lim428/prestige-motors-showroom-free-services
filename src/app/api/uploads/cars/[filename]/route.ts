import { readFile } from "node:fs/promises";
import path from "node:path";
import { fail } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

function uploadPath(filename: string) {
  return path.join(process.cwd(), "public", "uploads", "cars", path.basename(filename));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  try {
    const safeFilename = path.basename(decodeURIComponent(filename));
    const extension = path.extname(safeFilename).toLowerCase();
    const contentType = contentTypes[extension];

    if (!contentType) {
      return fail("Unsupported image type.", 400);
    }

    const file = await readFile(uploadPath(safeFilename));

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return fail("Image not found.", 404);
  }
}

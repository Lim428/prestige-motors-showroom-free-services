import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { hasCloudinaryConfig, uploadImageToCloudinary } from "@/lib/cloudinary";
import { HttpError } from "@/lib/errors";
import { imageAltTextFromFilename } from "@/lib/images";

const maxFileSize = 4 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedImage = {
  url: string;
  publicId: string | null;
  altText: string;
  width: number;
  height: number;
  sortOrder: number;
};

function getUploadDirectory() {
  return path.join(process.cwd(), "public", "uploads", "cars");
}

async function optimizeImage(input: Buffer) {
  try {
    return await sharp(input)
      .rotate()
      .resize({
        width: 1800,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 84, effort: 5 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new HttpError(
      422,
      "This image could not be processed. Re-export it as JPEG, PNG, or WebP and try again."
    );
  }
}

export async function optimizeAndSaveImages(files: File[]) {
  if (files.length === 0) {
    throw new HttpError(422, "Select at least one image to upload.");
  }

  if (files.length !== 1) {
    throw new HttpError(422, "Upload one image at a time.");
  }

  const useCloudinary = hasCloudinaryConfig();

  if (!useCloudinary && process.env.VERCEL) {
    throw new HttpError(
      500,
      "Cloudinary is not configured in Vercel. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (!useCloudinary) {
    await mkdir(getUploadDirectory(), { recursive: true });
  }

  const [file] = files;

  if (!file || !allowedTypes.has(file.type)) {
    throw new HttpError(422, "Only JPEG, PNG, and WebP images are supported.");
  }

  if (file.size > maxFileSize) {
    throw new HttpError(422, "Each image must be smaller than 4 MB.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${randomUUID()}.webp`;
  const { data, info } = await optimizeImage(input);

  const uploaded = useCloudinary
    ? await uploadImageToCloudinary({ data, filename })
    : null;

  if (!uploaded) {
    const destination = path.join(getUploadDirectory(), filename);
    await writeFile(destination, data);
  }

  const image: UploadedImage = {
    url: uploaded?.url ?? `/api/uploads/cars/${filename}`,
    publicId: uploaded?.publicId ?? null,
    altText: imageAltTextFromFilename(file.name, undefined, 1),
    width: uploaded?.width ?? info.width,
    height: uploaded?.height ?? info.height,
    sortOrder: 0
  };

  return [image];
}

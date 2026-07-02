import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { hasCloudinaryConfig, uploadImageToCloudinary } from "@/lib/cloudinary";
import { HttpError } from "@/lib/errors";

const maxFileSize = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedImage = {
  url: string;
  altText: string;
  width: number;
  height: number;
  sortOrder: number;
};

function getUploadDirectory() {
  return path.join(process.cwd(), "public", "uploads", "cars");
}

export async function optimizeAndSaveImages(files: File[]) {
  if (files.length === 0) {
    throw new HttpError(422, "Select at least one image to upload.");
  }

  if (files.length > 12) {
    throw new HttpError(422, "Upload up to 12 images at a time.");
  }

  await mkdir(getUploadDirectory(), { recursive: true });

  const images: UploadedImage[] = [];

  for (const [index, file] of files.entries()) {
    if (!allowedTypes.has(file.type)) {
      throw new HttpError(422, "Only JPEG, PNG, and WebP images are supported.");
    }

    if (file.size > maxFileSize) {
      throw new HttpError(422, "Each image must be smaller than 8 MB.");
    }

    const input = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID()}.webp`;
    const { data, info } = await sharp(input)
      .rotate()
      .resize({
        width: 1800,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 84, effort: 5 })
      .toBuffer({ resolveWithObject: true });

    const uploaded = hasCloudinaryConfig()
      ? await uploadImageToCloudinary({ data, filename })
      : null;

    if (!uploaded) {
      const destination = path.join(getUploadDirectory(), filename);
      await writeFile(destination, data);
    }

    images.push({
      url: uploaded?.url ?? `/api/uploads/cars/${filename}`,
      altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      width: uploaded?.width ?? info.width,
      height: uploaded?.height ?? info.height,
      sortOrder: index
    });
  }

  return images;
}

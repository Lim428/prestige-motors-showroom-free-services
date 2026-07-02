import { createHash } from "node:crypto";
import { HttpError } from "@/lib/errors";

type CloudinaryUploadResult = {
  secure_url: string;
  width: number;
  height: number;
};

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? "prestige-motors/cars"
  };
}

export function hasCloudinaryConfig() {
  return cloudinaryConfig() !== null;
}

function signUpload(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

export async function uploadImageToCloudinary(input: {
  data: Buffer;
  filename: string;
}) {
  const config = cloudinaryConfig();

  if (!config) {
    throw new HttpError(500, "Cloudinary is not configured.");
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const signedParams = {
    folder: config.folder,
    timestamp
  };
  const formData = new FormData();

  formData.append("file", new Blob([new Uint8Array(input.data)], { type: "image/webp" }), input.filename);
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", config.folder);
  formData.append("signature", signUpload(signedParams, config.apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );
  const result = (await response.json()) as Partial<CloudinaryUploadResult> & {
    error?: { message?: string };
  };

  if (!response.ok || !result.secure_url || !result.width || !result.height) {
    throw new HttpError(
      502,
      result.error?.message ?? "Image upload service failed."
    );
  }

  return {
    url: result.secure_url,
    width: result.width,
    height: result.height
  };
}

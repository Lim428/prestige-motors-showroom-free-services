import { createHash } from "node:crypto";
import { HttpError } from "@/lib/errors";

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
};

type CloudinaryDestroyResult = {
  result?: string;
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
    folder: (
      process.env.CLOUDINARY_UPLOAD_FOLDER ?? "prestige-motors/cars"
    ).replace(/^\/+|\/+$/g, "")
  };
}

export function hasCloudinaryConfig() {
  return cloudinaryConfig() !== null;
}

function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string
) {
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
  formData.append(
    "signature",
    signCloudinaryParams(signedParams, config.apiSecret)
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );
  const result = (await response.json().catch(() => ({}))) as Partial<
    CloudinaryUploadResult
  > & {
    error?: { message?: string };
  };

  if (
    !response.ok ||
    !result.secure_url ||
    !result.public_id ||
    !result.width ||
    !result.height
  ) {
    throw new HttpError(
      502,
      result.error?.message ?? "Image upload service failed."
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height
  };
}

function belongsToConfiguredUploadFolder(publicId: string, folder: string) {
  return (
    publicId.startsWith(`${folder}/`) && publicId.length > folder.length + 1
  );
}

export async function deleteImageFromCloudinary(
  publicId: string
): Promise<boolean> {
  const config = cloudinaryConfig();
  const normalizedPublicId = publicId.trim();

  if (
    !config ||
    !normalizedPublicId ||
    !belongsToConfiguredUploadFolder(normalizedPublicId, config.folder)
  ) {
    return false;
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const signedParams = {
    invalidate: "true",
    public_id: normalizedPublicId,
    timestamp
  };
  const formData = new FormData();

  formData.append("api_key", config.apiKey);
  formData.append("invalidate", "true");
  formData.append("public_id", normalizedPublicId);
  formData.append("timestamp", timestamp);
  formData.append(
    "signature",
    signCloudinaryParams(signedParams, config.apiSecret)
  );

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData
      }
    );
    const result = (await response
      .json()
      .catch(() => ({}))) as CloudinaryDestroyResult;
    const deleted =
      response.ok && (result.result === "ok" || result.result === "not found");

    if (!deleted) {
      console.error("Cloudinary image cleanup failed.", {
        status: response.status,
        result: result.result ?? "unknown"
      });
    }

    return deleted;
  } catch (error) {
    console.error("Cloudinary image cleanup failed.", {
      error: error instanceof Error ? error.name : "UnknownError"
    });
    return false;
  }
}

export async function deleteImagesFromCloudinary(
  publicIds: string[]
): Promise<void> {
  const uniquePublicIds = [
    ...new Set(publicIds.map((publicId) => publicId.trim()))
  ].filter(Boolean);

  await Promise.all(
    uniquePublicIds.map((publicId) => deleteImageFromCloudinary(publicId))
  );
}

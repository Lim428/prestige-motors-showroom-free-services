export function runtimeImageUrl(url: string) {
  if (url.startsWith("/api/uploads/cars/")) {
    return url;
  }

  if (url.startsWith("/uploads/cars/")) {
    const filename = url.split("/").pop();
    return filename ? `/api/uploads/cars/${encodeURIComponent(filename)}` : url;
  }

  return url;
}

export function isRuntimeImage(url: string) {
  return (
    url.startsWith("/uploads/cars/") ||
    url.startsWith("/api/uploads/cars/")
  );
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "").trim();
}

function isGenericCameraFilename(filename: string) {
  const compact = filenameWithoutExtension(filename)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return (
    compact.length < 2 ||
    /^(?:img|image|photo|dsc|dscn|pxl|camera|screenshot|whatsappimage|received|mmexport|fbimg|sam|wp)[a-z0-9]{3,}$/.test(
      compact
    ) ||
    /^(?:img|image|photo|camera|screenshot|whatsappimage)$/.test(compact) ||
    /^\d{8,}$/.test(compact) ||
    /^[a-f0-9]{16,}$/.test(compact) ||
    /^(?=.*[a-z])(?=.*\d)[a-z0-9]{20,}$/.test(compact)
  );
}

export function imageAltTextFromFilename(
  filename: string,
  vehicleName: string | undefined,
  position: number
) {
  const source = filenameWithoutExtension(filename);

  if (!isGenericCameraFilename(filename)) {
    return source.replace(/[-_]+/g, " ").replace(/\s+/g, " ").slice(0, 140);
  }

  const safeVehicleName = vehicleName?.trim().slice(0, 100) || "Vehicle";
  const safePosition = Math.max(1, Math.trunc(position) || 1);

  return `${safeVehicleName} showroom photo ${safePosition}`.slice(0, 140);
}

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
  return url.startsWith("/uploads/cars/") || url.startsWith("/api/uploads/cars/");
}

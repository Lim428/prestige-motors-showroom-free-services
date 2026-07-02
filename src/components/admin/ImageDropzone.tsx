"use client";

/* eslint-disable @next/next/no-img-element */
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  UploadCloud
} from "lucide-react";
import type { SerializedCarImage } from "@/lib/cars";
import { Button } from "@/components/ui/Button";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export type EditableImage = Pick<
  SerializedCarImage,
  "url" | "altText" | "width" | "height" | "sortOrder"
>;

type UploadResponse = {
  data?: EditableImage[];
  error?: string;
};

function normalizeImages(images: EditableImage[]) {
  return images.map((image, index) => ({ ...image, sortOrder: index }));
}

export function ImageDropzone({
  images,
  onChange
}: {
  images: EditableImage[];
  onChange: (images: EditableImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  async function upload(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setError("");
    setIsUploading(true);
    const localPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((current) => [...current, ...localPreviews]);

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    try {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.data) {
        setError(result.error ?? "Images could not be uploaded.");
        return;
      }

      onChange([
        ...images,
        ...result.data.map((image, index) => ({
          ...image,
          sortOrder: images.length + index
        }))
      ]);
    } finally {
      setIsUploading(false);
      setPreviewUrls((current) => current.filter((url) => !localPreviews.includes(url)));
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
    }
  }

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    upload(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    upload(Array.from(event.dataTransfer.files));
  }

  function removeImage(index: number) {
    onChange(normalizeImages(images.filter((_, imageIndex) => imageIndex !== index)));
  }

  function updateAltText(index: number, altText: string) {
    onChange(
      images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, altText } : image
      )
    );
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= images.length || fromIndex === toIndex) {
      return;
    }

    const nextImages = [...images];
    const [movedImage] = nextImages.splice(fromIndex, 1);

    if (!movedImage) {
      return;
    }

    nextImages.splice(toIndex, 0, movedImage);
    onChange(normalizeImages(nextImages));
  }

  function onImageDrop(toIndex: number) {
    if (draggedIndex === null) {
      return;
    }

    moveImage(draggedIndex, toIndex);
    setDraggedIndex(null);
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-md border border-dashed p-5 text-center transition",
          isDragging ? "border-copper bg-copper/5" : "border-ink/20 bg-smoke"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={onFilesSelected}
        />
        <UploadCloud className="mx-auto h-8 w-8 text-copper" />
        <p className="mt-3 text-sm font-semibold text-ink">Drop vehicle images here</p>
        <p className="mt-1 text-xs text-ink/50">JPEG, PNG, or WebP up to 8 MB each</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          icon={
            isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )
          }
        >
          {isUploading ? "Optimizing..." : "Choose images"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

      {previewUrls.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previewUrls.map((url) => (
            <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
              <img src={url} alt="Upload preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-ink/35 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onImageDrop(index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={cn(
                "rounded-md border bg-white p-3 transition",
                draggedIndex === index
                  ? "border-copper opacity-60"
                  : "border-ink/10 hover:border-ink/25"
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
                <Image
                  src={runtimeImageUrl(image.url)}
                  alt={image.altText}
                  fill
                  unoptimized={isRuntimeImage(image.url)}
                  sizes="240px"
                  className="object-cover"
                />
                <div className="absolute left-2 top-2 flex items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-1 rounded-md bg-white/92 px-2 text-xs font-bold text-ink shadow-sm">
                    {index === 0 ? (
                      <>
                        <Star className="h-3.5 w-3.5 fill-champagne text-champagne" />
                        Cover
                      </>
                    ) : (
                      `Photo ${index + 1}`
                    )}
                  </span>
                </div>
                <div className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-white/92 text-ink/55 shadow-sm">
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={image.altText}
                  onChange={(event) => updateAltText(index, event.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
                  aria-label="Image alt text"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => moveImage(index, index - 1)}
                  disabled={index === 0}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-ink/10 text-sm font-semibold text-ink/65 transition hover:border-ink/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move image earlier"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Earlier
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, index + 1)}
                  disabled={index === images.length - 1}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-ink/10 text-sm font-semibold text-ink/65 transition hover:border-ink/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move image later"
                >
                  Later
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                  aria-label="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

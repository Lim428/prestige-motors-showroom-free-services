"use client";

/* eslint-disable @next/next/no-img-element */
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState
} from "react";
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
import { adminFetch } from "@/components/admin/adminFetch";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export type EditableImage = Pick<
  SerializedCarImage,
  "url" | "altText" | "width" | "height" | "sortOrder"
>;

const maxFileSize = 4 * 1024 * 1024;
const maxImages = 12;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeImages(images: EditableImage[]) {
  return images.map((image, index) => ({ ...image, sortOrder: index }));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ImageDropzone({
  images,
  onChange,
  fieldError
}: {
  images: EditableImage[];
  onChange: (images: EditableImage[]) => void;
  fieldError?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function upload(files: File[]) {
    if (files.length === 0 || isUploading) {
      return;
    }

    const remainingSlots = maxImages - images.length;

    if (remainingSlots <= 0) {
      setError("This listing already has the maximum of 12 photos.");
      return;
    }

    if (files.length > remainingSlots) {
      setError(
        `Choose no more than ${remainingSlots} additional ${
          remainingSlots === 1 ? "photo" : "photos"
        }.`
      );
      return;
    }

    const unsupportedFile = files.find((file) => !allowedTypes.has(file.type));

    if (unsupportedFile) {
      setError("Only JPEG, PNG, and WebP images can be uploaded.");
      return;
    }

    const oversizedFile = files.find((file) => file.size > maxFileSize);

    if (oversizedFile) {
      setError("Each image must be smaller than 4 MB.");
      return;
    }

    setError("");
    setIsUploading(true);
    const localPreviews = files.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current = [...previewUrlsRef.current, ...localPreviews];
    setPreviewUrls((current) => [...current, ...localPreviews]);

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    try {
      const uploadedImages = await adminFetch<EditableImage[]>(
        "/api/admin/uploads",
        {
          method: "POST",
          body: formData
        },
        "Images could not be uploaded."
      );

      onChange(
        normalizeImages([
          ...images,
          ...uploadedImages.map((image) => ({
            ...image,
            sortOrder: 0
          }))
        ])
      );
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Images could not be uploaded."));
    } finally {
      setIsUploading(false);
      setPreviewUrls((current) =>
        current.filter((url) => !localPreviews.includes(url))
      );
      previewUrlsRef.current = previewUrlsRef.current.filter(
        (url) => !localPreviews.includes(url)
      );
      localPreviews.forEach((url) => URL.revokeObjectURL(url));
    }
  }

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    void upload(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!isUploading) {
      void upload(Array.from(event.dataTransfer.files));
    }
  }

  function removeImage(index: number) {
    if (isUploading) {
      return;
    }

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
    if (
      isUploading ||
      toIndex < 0 ||
      toIndex >= images.length ||
      fromIndex === toIndex
    ) {
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
    if (draggedIndex === null || isUploading) {
      return;
    }

    moveImage(draggedIndex, toIndex);
    setDraggedIndex(null);
  }

  const visibleError = error || fieldError;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();

          if (!isUploading) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        aria-disabled={isUploading}
        className={cn(
          "rounded-md border border-dashed p-5 text-center transition sm:p-6",
          isDragging
            ? "border-copper bg-copper/5"
            : "border-ink/20 bg-smoke",
          isUploading && "cursor-wait opacity-80"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={isUploading || images.length >= maxImages}
          className="sr-only"
          onChange={onFilesSelected}
          aria-describedby="vehicle-image-upload-help"
        />
        <UploadCloud
          className="mx-auto h-8 w-8 text-copper"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-bold text-ink">
          Drop vehicle photos here
        </p>
        <p
          id="vehicle-image-upload-help"
          className="mt-1 text-xs leading-5 text-ink/65"
        >
          JPEG, PNG, or WebP · up to 4 MB each · {images.length} of {maxImages}{" "}
          uploaded
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 focus:outline-none focus:ring-2 focus:ring-ink/20 focus:ring-offset-2"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || images.length >= maxImages}
          icon={
            isUploading ? (
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )
          }
        >
          {isUploading
            ? "Uploading and optimising..."
            : images.length >= maxImages
              ? "Photo limit reached"
              : "Choose photos"}
        </Button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {visibleError ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
            {visibleError}
          </p>
        ) : isUploading ? (
          <p className="mt-3 text-sm font-semibold text-ink/65">
            Uploading {previewUrls.length}{" "}
            {previewUrls.length === 1 ? "photo" : "photos"}. Keep this form open.
          </p>
        ) : null}
      </div>

      {previewUrls.length > 0 ? (
        <div
          aria-label="Photos currently uploading"
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {previewUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100"
            >
              <img
                src={url}
                alt={`Upload preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 grid place-items-center bg-ink/40 text-white">
                <Loader2
                  className="h-5 w-5 animate-spin"
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {images.map((image, index) => {
            const altTextInvalid = image.altText.trim().length < 2;
            const inputId = `vehicle-image-alt-${index}`;

            return (
              <div
                key={`${image.url}-${index}`}
                draggable={!isUploading}
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
                    alt={image.altText || `Vehicle photo ${index + 1}`}
                    fill
                    unoptimized={isRuntimeImage(image.url)}
                    sizes="(min-width: 1536px) 300px, (min-width: 768px) 40vw, 90vw"
                    className="object-cover"
                  />
                  <div className="absolute left-2 top-2">
                    <span className="inline-flex h-8 items-center gap-1 rounded-md bg-white/95 px-2 text-xs font-bold text-ink shadow-sm">
                      {index === 0 ? (
                        <>
                          <Star
                            className="h-3.5 w-3.5 fill-champagne text-champagne"
                            aria-hidden="true"
                          />
                          Cover
                        </>
                      ) : (
                        `Photo ${index + 1}`
                      )}
                    </span>
                  </div>
                  <div
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-white/95 text-ink/65 shadow-sm"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>

                <label
                  htmlFor={inputId}
                  className="mt-3 block text-xs font-bold text-ink"
                >
                  Alternative text for photo {index + 1}
                </label>
                <input
                  id={inputId}
                  required
                  maxLength={140}
                  value={image.altText}
                  onChange={(event) => updateAltText(index, event.target.value)}
                  disabled={isUploading}
                  aria-invalid={altTextInvalid}
                  aria-describedby={`${inputId}-help`}
                  className={cn(
                    "mt-1.5 h-11 w-full rounded-md border bg-smoke px-3 text-sm text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-ink/15",
                    altTextInvalid
                      ? "border-red-300 focus:border-red-500"
                      : "border-ink/15 focus:border-ink"
                  )}
                />
                <p id={`${inputId}-help`} className="mt-1 text-xs text-ink/60">
                  Describe what is visible; avoid “image of”.
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    disabled={isUploading || index === 0}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-ink/15 text-sm font-bold text-ink/70 outline-none transition hover:border-ink/30 hover:text-ink focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move photo ${index + 1} earlier`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    disabled={isUploading || index === images.length - 1}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-ink/15 text-sm font-bold text-ink/70 outline-none transition hover:border-ink/30 hover:text-ink focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move photo ${index + 1} later`}
                  >
                    Later
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={isUploading}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-red-700 outline-none transition hover:bg-red-50 focus:ring-2 focus:ring-red-300 focus:ring-offset-2 disabled:opacity-40"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

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
import {
  imageAltTextFromFilename,
  isRuntimeImage,
  runtimeImageUrl
} from "@/lib/images";
import { cn } from "@/lib/utils";

export type EditableImage = Pick<
  SerializedCarImage,
  "url" | "altText" | "width" | "height" | "sortOrder"
> & {
  publicId: string | null;
};

const maxFileSize = 4 * 1024 * 1024;
const maxImages = 21;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const dealerPhotoChecklist = [
  "Front three-quarter cover (landscape)",
  "Front straight-on",
  "Rear three-quarter",
  "Rear straight-on",
  "Driver-side profile",
  "Passenger-side profile",
  "Front wheel and tyre tread",
  "Rear wheel and tyre tread",
  "Dashboard and cockpit",
  "Odometer with ignition on",
  "Infotainment and air-conditioning",
  "Steering wheel and controls",
  "Driver and front passenger seats",
  "Rear seats and legroom",
  "Roof lining",
  "Boot or cargo area",
  "Spare tyre and toolkit",
  "Engine bay",
  "Keys and included accessories",
  "Redacted service or warranty records",
  "Every scratch, dent, or defect"
];

type UploadProgress = {
  completed: number;
  succeeded: number;
  total: number;
};

type UploadFailure = {
  filename: string;
  reason: string;
};

function normalizeImages(images: EditableImage[]) {
  return images.map((image, index) => ({ ...image, sortOrder: index }));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function uploadFailureMessage(
  failures: UploadFailure[],
  successfulUploads: number
) {
  const details = failures
    .slice(0, 3)
    .map(({ filename, reason }) => `${filename}: ${reason}`)
    .join(" · ");
  const remaining = failures.length - 3;
  const successMessage =
    successfulUploads > 0
      ? ` ${successfulUploads} ${
          successfulUploads === 1 ? "photo was" : "photos were"
        } added successfully.`
      : "";

  return `${failures.length} ${
    failures.length === 1 ? "photo" : "photos"
  } could not be uploaded. ${details}${
    remaining > 0 ? ` · ${remaining} more` : ""
  }.${successMessage} Fix or resize them if needed, then reselect the failed ${
    failures.length === 1 ? "file" : "files"
  } to retry.`;
}

export function ImageDropzone({
  images,
  onChange,
  fieldError,
  vehicleName
}: {
  images: EditableImage[];
  onChange: (images: EditableImage[]) => void;
  fieldError?: string;
  vehicleName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
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
      setError("This listing already has the maximum of 21 photos.");
      return;
    }

    if (files.length > remainingSlots) {
      setError(
        `Choose no more than ${remainingSlots} additional ${
          remainingSlots === 1 ? "photo" : "photos"
        } for this listing.`
      );
      return;
    }

    const failures: UploadFailure[] = [];
    const acceptedFiles = files.filter((file) => {
      if (!allowedTypes.has(file.type)) {
        failures.push({
          filename: file.name,
          reason: "use a JPEG, PNG, or WebP file"
        });
        return false;
      }

      if (file.size > maxFileSize) {
        failures.push({
          filename: file.name,
          reason: "the file is larger than 4 MB"
        });
        return false;
      }

      return true;
    });

    if (acceptedFiles.length === 0) {
      setError(uploadFailureMessage(failures, 0));
      return;
    }

    setError("");
    setIsUploading(true);
    setUploadProgress({
      completed: 0,
      succeeded: 0,
      total: acceptedFiles.length
    });
    const localPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current = [...previewUrlsRef.current, ...localPreviews];
    setPreviewUrls((current) => [...current, ...localPreviews]);
    const successfulImages: EditableImage[] = [];

    try {
      for (const [fileIndex, file] of acceptedFiles.entries()) {
        const formData = new FormData();
        formData.append("images", file);

        try {
          const uploadedImages = await adminFetch<EditableImage[]>(
            "/api/admin/uploads",
            {
              method: "POST",
              body: formData
            },
            `${file.name} could not be uploaded.`
          );
          const uploadedImage = uploadedImages[0];

          if (!uploadedImage) {
            throw new Error("The upload service returned no image.");
          }

          const nextPosition = images.length + successfulImages.length + 1;
          successfulImages.push({
            ...uploadedImage,
            publicId: uploadedImage.publicId ?? null,
            altText: imageAltTextFromFilename(
              file.name,
              vehicleName,
              nextPosition
            ),
            sortOrder: nextPosition - 1
          });
          onChange(normalizeImages([...images, ...successfulImages]));
        } catch (uploadError) {
          failures.push({
            filename: file.name,
            reason: errorMessage(uploadError, "upload failed")
          });
        } finally {
          setUploadProgress({
            completed: fileIndex + 1,
            succeeded: successfulImages.length,
            total: acceptedFiles.length
          });
        }
      }

      if (failures.length > 0) {
        setError(uploadFailureMessage(failures, successfulImages.length));
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
      <section
        aria-labelledby="malaysia-dealer-photo-guide"
        className="mb-4 border border-ink/15 border-l-4 border-l-signal bg-white p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3
              id="malaysia-dealer-photo-guide"
              className="font-display text-base font-black uppercase tracking-wide text-ink"
            >
              Malaysian dealer photo checklist
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink/65">
              Use landscape photos in a dry, evenly lit bay. Lead with a clear
              front three-quarter view.
            </p>
          </div>
          <span className="shrink-0 border border-ink/15 bg-smoke px-3 py-1 text-[11px] font-black uppercase tracking-wide text-ink/65">
            21-shot guide · 21 maximum
          </span>
        </div>
        <details className="group mt-3 border border-ink/10 bg-smoke/50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-black text-ink outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2">
            View all 21 recommended shots
          </summary>
          <ol className="mt-3 grid gap-x-5 gap-y-2 border-t border-ink/10 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {dealerPhotoChecklist.map((item, index) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs font-semibold leading-5 text-ink/70"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center bg-signal text-[10px] font-black text-white">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </details>
        <p className="mt-3 border-t border-ink/10 pt-3 text-[11px] leading-5 text-ink/60">
          Mask number plates and never upload owner details, an IC, address, or
          an unredacted registration document.
        </p>
      </section>

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
          "border border-dashed p-5 text-center transition sm:p-6",
          isDragging
            ? "border-signal bg-signal/5"
            : "border-ink/25 bg-smoke/70",
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
          aria-label="Upload vehicle photos"
          aria-describedby="vehicle-image-upload-help"
        />
        <UploadCloud
          className="mx-auto h-8 w-8 text-signal"
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
        ) : isUploading && uploadProgress ? (
          <p className="mt-3 text-sm font-semibold text-ink/65">
            Uploading one at a time: {uploadProgress.completed} of{" "}
            {uploadProgress.total} complete · {uploadProgress.succeeded} added.
            Keep this form open.
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
              className="relative aspect-[4/3] overflow-hidden bg-zinc-100"
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
                  "border bg-white p-3 transition",
                  draggedIndex === index
                    ? "border-signal opacity-60"
                    : "border-ink/10 hover:border-ink/25"
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                  <Image
                    src={runtimeImageUrl(image.url)}
                    alt={image.altText || `Vehicle photo ${index + 1}`}
                    fill
                    unoptimized={isRuntimeImage(image.url)}
                    sizes="(min-width: 1536px) 300px, (min-width: 768px) 40vw, 90vw"
                    className="object-cover"
                  />
                  <div className="absolute left-2 top-2">
                    <span className="inline-flex h-8 items-center gap-1 border border-ink/10 bg-white/95 px-2 text-xs font-bold text-ink">
                      {index === 0 ? (
                        <>
                          <Star
                            className="h-3.5 w-3.5 fill-signal text-signal"
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
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center border border-ink/10 bg-white/95 text-ink/65"
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
                    "mt-1.5 h-11 w-full border bg-white px-3 text-sm text-ink outline-none transition hover:border-ink/35 focus:border-signal focus:ring-2 focus:ring-signal/15",
                    altTextInvalid
                      ? "border-red-300 focus:border-red-500"
                      : "border-ink/15 focus:border-ink"
                  )}
                />
                <p id={`${inputId}-help`} className="mt-1 text-xs text-ink/60">
                  Describe what is visible; avoid “image of”.
                </p>

                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 0)}
                    disabled={isUploading}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 border border-signal bg-signal/5 text-sm font-black uppercase tracking-wide text-signal outline-none transition hover:bg-signal hover:text-white focus:ring-2 focus:ring-signal focus:ring-offset-2 disabled:opacity-40"
                    aria-label={`Set photo ${index + 1} as the showroom cover`}
                  >
                    <Star className="h-4 w-4" aria-hidden="true" />
                    Set as cover
                  </button>
                ) : null}

                <div className={cn("flex gap-2", index > 0 ? "mt-2" : "mt-3")}>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    disabled={isUploading || index === 0}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-ink/20 text-sm font-bold text-ink/70 outline-none transition hover:border-ink hover:bg-smoke hover:text-ink focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move photo ${index + 1} earlier`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    disabled={isUploading || index === images.length - 1}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-ink/20 text-sm font-bold text-ink/70 outline-none transition hover:border-ink hover:bg-smoke hover:text-ink focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move photo ${index + 1} later`}
                  >
                    Later
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={isUploading}
                    className="grid h-11 w-11 shrink-0 place-items-center border border-transparent text-red-700 outline-none transition hover:border-red-200 hover:bg-red-50 focus:ring-2 focus:ring-red-300 focus:ring-offset-2 disabled:opacity-40"
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

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { SerializedCarImage } from "@/lib/cars";
import { trackEngagement } from "@/lib/clientAnalytics";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export function CarGallery({
  carId,
  images,
  title
}: {
  carId: string;
  images: SerializedCarImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const safeActiveIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const activeImage = images[safeActiveIndex] ?? images[0];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    thumbnailRefs.current[safeActiveIndex]?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center"
    });
  }, [safeActiveIndex]);

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
    trackEngagement("GALLERY_INTERACTION", {
      carId,
      metadata: { action: "previous" }
    });
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % images.length);
    trackEngagement("GALLERY_INTERACTION", {
      carId,
      metadata: { action: "next" }
    });
  }

  return (
    <figure aria-label={`${title} photo gallery`} className="space-y-4">
      <div className="group relative aspect-[4/3] overflow-hidden border border-ink/15 bg-zinc-200 sm:aspect-[16/10]">
        {activeImage ? (
          <Image
            src={runtimeImageUrl(activeImage.url)}
            alt={activeImage.altText}
            fill
            unoptimized={isRuntimeImage(activeImage.url)}
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center bg-smoke text-center text-ink/50">
            <div>
              <ImageIcon className="mx-auto h-8 w-8" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Photography coming soon</p>
            </div>
          </div>
        )}

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-0 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border-y border-r border-white/30 bg-ink/85 text-white transition hover:bg-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset sm:left-4 sm:border"
              aria-label={`Show previous ${title} photo`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-0 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border-y border-l border-white/30 bg-ink/85 text-white transition hover:bg-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset sm:right-4 sm:border"
              aria-label={`Show next ${title} photo`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}

        {images.length > 0 ? (
          <div
            className="absolute bottom-0 right-0 border-l border-t border-white/25 bg-ink px-3 py-2 text-xs font-black tabular-nums tracking-[0.12em] text-white sm:bottom-4 sm:right-4 sm:border"
            aria-live="polite"
            aria-atomic="true"
          >
            {safeActiveIndex + 1} / {images.length}
          </div>
        ) : null}
      </div>

      {activeImage ? (
        <figcaption className="flex items-start justify-between gap-4 border-b border-ink/15 pb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50">
          <span className="line-clamp-1">{activeImage.altText}</span>
          <span className="shrink-0 font-semibold text-ink/65">
            Dealer photography
          </span>
        </figcaption>
      ) : null}

      {hasMultipleImages ? (
        <div
          className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2"
          aria-label={`${title} thumbnails`}
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              ref={(node) => {
                thumbnailRefs.current[index] = node;
              }}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                trackEngagement("GALLERY_INTERACTION", {
                  carId,
                  metadata: { action: "thumbnail", imageIndex: index }
                });
              }}
              aria-label={`Show ${title} image ${index + 1}`}
              aria-pressed={safeActiveIndex === index}
              className={cn(
                "relative aspect-[4/3] w-24 shrink-0 overflow-hidden border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 sm:w-28",
                safeActiveIndex === index
                  ? "border-racing"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={runtimeImageUrl(image.url)}
                alt={image.altText}
                fill
                unoptimized={isRuntimeImage(image.url)}
                sizes="140px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </figure>
  );
}

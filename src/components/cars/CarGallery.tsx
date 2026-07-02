"use client";

import { useState } from "react";
import Image from "next/image";
import type { SerializedCarImage } from "@/lib/cars";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export function CarGallery({
  images,
  title
}: {
  images: SerializedCarImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-zinc-200 shadow-panel">
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
          <div className="grid h-full place-items-center text-sm text-ink/50">
            Image unavailable
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${title} image ${index + 1}`}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-md border bg-white transition",
                activeIndex === index
                  ? "border-ink shadow-panel"
                  : "border-ink/10 opacity-75 hover:opacity-100"
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
    </div>
  );
}

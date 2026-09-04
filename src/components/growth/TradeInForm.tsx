"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  Camera,
  CarFront,
  CheckCircle2,
  ImagePlus,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud
} from "lucide-react";
import { apiErrorMessage } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type UploadedImage = {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
};

export type TradeInFormProps = {
  className?: string;
  onSuccess?: (tradeInId: string) => void;
};

type FormState = "idle" | "success" | "error";
type SubmitPhase = "idle" | "uploading" | "submitting";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const fieldClass =
  "mt-2 h-12 w-full border border-ink/20 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20";

export function TradeInForm({ className, onSuccess }: TradeInFormProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [imageMessage, setImageMessage] = useState("");
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  function onChooseImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setImageMessage("");

    if (images.length + files.length > MAX_IMAGES) {
      setImageMessage(`Choose up to ${MAX_IMAGES} photos in total.`);
      return;
    }

    const invalidType = files.find((file) => !acceptedTypes.has(file.type));

    if (invalidType) {
      setImageMessage(`${invalidType.name} is not a JPG, PNG, or WebP image.`);
      return;
    }

    const oversized = files.find((file) => file.size > MAX_IMAGE_BYTES);

    if (oversized) {
      setImageMessage(`${oversized.name} is larger than 4 MB.`);
      return;
    }

    const nextImages = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl
      };
    });

    setImages((current) => [...current, ...nextImages]);
  }

  function removeImage(imageId: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === imageId);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== image.previewUrl);
      }

      return current.filter((item) => item.id !== imageId);
    });
  }

  async function uploadImages() {
    if (images.length === 0) {
      return [] as UploadedImage[];
    }

    const uploadedImages: UploadedImage[] = [];

    // Vercel Functions cap request bodies at 4.5 MB, so each photo is sent in
    // its own request while the overall appraisal can still include six.
    for (const image of images) {
      const uploadData = new FormData();
      uploadData.append("images", image.file, image.file.name);

      const response = await fetch("/api/trade-ins/images", {
        method: "POST",
        body: uploadData
      });

      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "Your photos could not be uploaded."));
      }

      const result = (await response.json()) as { data?: { images?: UploadedImage[] } };
      uploadedImages.push(...(result.data?.images ?? []));
    }

    return uploadedImages;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (phase !== "idle") {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setState("idle");
    setMessage("");

    try {
      setPhase(images.length > 0 ? "uploading" : "submitting");
      const uploadedImages = await uploadImages();
      setPhase("submitting");

      const response = await fetch("/api/trade-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          make: formData.get("make"),
          model: formData.get("model"),
          year: Number(formData.get("year")),
          mileage: Number(formData.get("mileage")),
          registration: formData.get("registration") || undefined,
          condition: formData.get("condition"),
          expectedPrice: formData.get("expectedPrice")
            ? Number(formData.get("expectedPrice"))
            : undefined,
          notes: formData.get("notes") || undefined,
          consent: formData.get("consent") === "on",
          images: uploadedImages.map((image, index) => ({
            url: image.url,
            altText: image.altText || `Trade-in vehicle photo ${index + 1}`
          }))
        })
      });

      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "Your trade-in request could not be sent."));
      }

      const result = (await response.json()) as { data?: { id?: string } };
      const tradeInId = result.data?.id ?? "";

      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
      setImages([]);
      form.reset();
      setState("success");
      setMessage("Your trade-in profile is with our appraisal team. We will contact you with the next step.");
      onSuccess?.(tradeInId);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Your trade-in request could not be sent. Please try again."
      );
    } finally {
      setPhase("idle");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={phase !== "idle"}
      className={cn(
        "overflow-hidden border border-ink/15 bg-white",
        className
      )}
    >
      <div className="border-b-8 border-racing bg-ink p-5 text-white sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center border border-white/25 bg-racing text-white">
            <CarFront className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
              Upgrade with ease
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase leading-none tracking-[-0.02em]">Request a trade-in appraisal</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Share your vehicle&apos;s essentials and a few clear photos. Our team will review it
              before discussing an indicative value with you.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <fieldset disabled={state === "success"}>
          <legend className="font-display text-2xl font-black uppercase leading-none text-ink">Your vehicle</legend>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label htmlFor={`${id}-make`}>
              <span className="text-sm font-bold text-ink/75">Make</span>
              <input id={`${id}-make`} name="make" required minLength={2} maxLength={60} placeholder="e.g. Toyota" className={fieldClass} />
            </label>
            <label htmlFor={`${id}-model`}>
              <span className="text-sm font-bold text-ink/75">Model</span>
              <input id={`${id}-model`} name="model" required minLength={1} maxLength={80} placeholder="e.g. Camry 2.5V" className={fieldClass} />
            </label>
            <label htmlFor={`${id}-year`}>
              <span className="text-sm font-bold text-ink/75">Registration year</span>
              <input id={`${id}-year`} name="year" type="number" inputMode="numeric" required min={1980} max={new Date().getFullYear() + 1} placeholder="2020" className={fieldClass} />
            </label>
            <label htmlFor={`${id}-mileage`}>
              <span className="text-sm font-bold text-ink/75">Mileage (km)</span>
              <input id={`${id}-mileage`} name="mileage" type="number" inputMode="numeric" required min={0} max={2_000_000} step={100} placeholder="45000" className={fieldClass} />
            </label>
            <label htmlFor={`${id}-registration`}>
              <span className="text-sm font-bold text-ink/75">
                Registration number <span className="font-normal text-ink/40">(optional)</span>
              </span>
              <input id={`${id}-registration`} name="registration" maxLength={20} autoCapitalize="characters" placeholder="ABC 1234" className={fieldClass} />
            </label>
            <label htmlFor={`${id}-condition`}>
              <span className="text-sm font-bold text-ink/75">Overall condition</span>
              <select id={`${id}-condition`} name="condition" required defaultValue="" className={fieldClass}>
                <option value="" disabled>Select condition</option>
                <option value="Excellent">Excellent — exceptionally clean</option>
                <option value="Good">Good — normal signs of use</option>
                <option value="Fair">Fair — some repairs may be needed</option>
                <option value="Needs attention">Needs attention — significant work needed</option>
              </select>
            </label>
            <label htmlFor={`${id}-expected-price`} className="sm:col-span-2">
              <span className="text-sm font-bold text-ink/75">
                Expected value (RM) <span className="font-normal text-ink/40">(optional)</span>
              </span>
              <input id={`${id}-expected-price`} name="expectedPrice" type="number" inputMode="numeric" min={0} max={10_000_000} step={500} placeholder="Your expected trade-in value" className={fieldClass} />
            </label>
          </div>

          <div className="mt-7 border-t border-ink/10 pt-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-ink">
                  <Camera className="h-5 w-5 text-racing" aria-hidden="true" />
                  Vehicle photos
                </h3>
                <p id={`${id}-image-help`} className="mt-1 text-xs leading-5 text-ink/50">
                  Optional. Add up to {MAX_IMAGES} JPG, PNG, or WebP photos, maximum 4 MB each.
                </p>
              </div>
              <span className="text-xs font-black text-ink/45">{images.length}/{MAX_IMAGES} selected</span>
            </div>

            {images.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Selected trade-in photos">
                {images.map((image, index) => (
                  <li key={image.id} className="group relative aspect-[4/3] overflow-hidden border border-ink/15 bg-smoke">
                    <Image src={image.previewUrl} alt={`Selected vehicle photo ${index + 1}`} fill unoptimized className="object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/20 bg-ink/90 p-2">
                      <span className="truncate text-[10px] font-bold text-white/80">{image.file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        aria-label={`Remove ${image.file.name}`}
                        className="grid h-8 w-8 shrink-0 place-items-center bg-white text-ink transition hover:bg-racing hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            <input
              ref={inputRef}
              id={`${id}-images`}
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              aria-label="Upload trade-in vehicle photos"
              aria-describedby={`${id}-image-help ${id}-image-message`}
              onChange={onChooseImages}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 border border-dashed border-ink/30 bg-smoke px-4 text-sm font-black uppercase tracking-[0.06em] text-ink transition hover:border-racing hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4 text-racing" aria-hidden="true" />
              {images.length > 0 ? "Add more photos" : "Choose vehicle photos"}
            </button>
            <p id={`${id}-image-message`} role="alert" className="mt-2 text-xs font-semibold text-red-700">
              {imageMessage}
            </p>
          </div>

          <div className="mt-7 border-t border-ink/10 pt-7">
            <h3 className="font-display text-2xl font-black uppercase leading-none text-ink">Your contact details</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label htmlFor={`${id}-name`}>
                <span className="text-sm font-bold text-ink/75">Your name</span>
                <input id={`${id}-name`} name="name" required minLength={2} maxLength={100} autoComplete="name" className={fieldClass} />
              </label>
              <label htmlFor={`${id}-phone`}>
                <span className="text-sm font-bold text-ink/75">Phone</span>
                <input id={`${id}-phone`} name="phone" type="tel" required maxLength={40} autoComplete="tel" inputMode="tel" className={fieldClass} />
              </label>
              <label htmlFor={`${id}-email`} className="sm:col-span-2">
                <span className="text-sm font-bold text-ink/75">Email</span>
                <input id={`${id}-email`} name="email" type="email" required maxLength={160} autoComplete="email" inputMode="email" className={fieldClass} />
              </label>
              <label htmlFor={`${id}-notes`} className="sm:col-span-2">
                <span className="text-sm font-bold text-ink/75">
                  Vehicle notes <span className="font-normal text-ink/40">(optional)</span>
                </span>
                <textarea id={`${id}-notes`} name="notes" rows={4} maxLength={1500} placeholder="Service history, outstanding finance, modifications, accident history, or anything else we should know." className="mt-2 w-full resize-y border border-ink/20 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20" />
              </label>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 border-l-4 border-ink bg-smoke p-4">
            <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 border-ink/20 accent-racing" />
            <span className="text-xs leading-5 text-ink/60">
              I confirm these details are accurate and agree that Prestige Motors may contact me
              about this appraisal. An online estimate is not a binding offer.
            </span>
          </label>
        </fieldset>

        {message ? (
          <div
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
            className={cn(
              "mt-5 flex items-start gap-2 border-l-4 px-4 py-3 text-sm font-semibold leading-6",
              state === "success" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-700 bg-red-50 text-red-700"
            )}
          >
            {state === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            <span>{message}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={phase !== "idle" || state === "success"}
          className={cn(
            "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.08em] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
            state === "success"
              ? "bg-emerald-700 focus-visible:ring-emerald-500/30"
              : "bg-racing hover:bg-copper focus-visible:ring-racing/30"
          )}
        >
          {phase === "uploading" ? (
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
          ) : state === "success" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {phase === "uploading"
            ? "Uploading photos..."
            : phase === "submitting"
              ? "Sending appraisal..."
              : state === "success"
                ? "Appraisal requested"
                : "Request my appraisal"}
        </button>

        <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-ink/45">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Photos are uploaded securely and used only to evaluate this trade-in request.
        </p>
      </div>
    </form>
  );
}

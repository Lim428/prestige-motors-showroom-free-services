"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Sparkles,
  X
} from "lucide-react";
import type { CarStatus, FuelType, Transmission } from "@prisma/client";
import type { SerializedCar } from "@/lib/cars";
import { Button } from "@/components/ui/Button";
import { ImageDropzone, type EditableImage } from "@/components/admin/ImageDropzone";
import { ListingReadinessPanel } from "@/components/admin/ListingReadinessPanel";
import {
  assessListingReadiness,
  buildDescriptionTemplate,
  getVehicleName,
  nullableNumber,
  nullableText,
  type DescriptionLanguage,
  type ListingEditorFacts
} from "@/components/admin/listingEditor";
import { adminFetch } from "@/components/admin/adminFetch";
import { titleCaseEnum } from "@/lib/format";
import { carInputSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

const fuelTypes: FuelType[] = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"];
const transmissions: Transmission[] = ["AUTOMATIC", "MANUAL"];
const statuses: CarStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];
const currentYear = new Date().getFullYear();

type MalaysiaListingFields = {
  stockCode: string | null;
  variant: string | null;
  registrationYear: number | null;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  engineCc: number | null;
  seats: number | null;
  doors: number | null;
  drivetrain: string | null;
  assemblyType: string | null;
  showroomLocation: string | null;
  isPublished: boolean;
};

type FormState = ListingEditorFacts & {
  transmission: Transmission;
  fuelType: FuelType;
  status: CarStatus;
  isPublished: boolean;
  images: EditableImage[];
};

type FieldErrors = Record<string, string>;

const inputClassName =
  "mt-2 h-11 w-full border border-ink/20 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink/45 hover:border-ink/35 focus:border-signal focus:ring-2 focus:ring-signal/15";

function emptyForm(): FormState {
  return {
    stockCode: "",
    brand: "",
    model: "",
    variant: "",
    year: String(currentYear),
    registrationYear: "",
    bodyType: "",
    mileage: "",
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "",
    engineCc: "",
    exteriorColor: "",
    interiorColor: "",
    seats: "",
    doors: "",
    drivetrain: "",
    assemblyType: "",
    price: "",
    condition: "Excellent",
    showroomLocation: "",
    description: "",
    features: "",
    status: "AVAILABLE",
    isPublished: false,
    images: []
  };
}

function formFromCar(car?: SerializedCar): FormState {
  if (!car) {
    return emptyForm();
  }

  // Partial keeps the editor usable during rolling deployments of older records.
  const listing = car as SerializedCar & Partial<MalaysiaListingFields>;

  return {
    stockCode: listing.stockCode ?? "",
    brand: car.brand,
    model: car.model,
    variant: listing.variant ?? "",
    year: String(car.year),
    registrationYear:
      listing.registrationYear === null || listing.registrationYear === undefined
        ? ""
        : String(listing.registrationYear),
    bodyType: listing.bodyType ?? "",
    mileage: String(car.mileage),
    transmission: car.transmission,
    fuelType: car.fuelType,
    engine: car.engine,
    engineCc:
      listing.engineCc === null || listing.engineCc === undefined
        ? ""
        : String(listing.engineCc),
    exteriorColor: listing.exteriorColor ?? "",
    interiorColor: listing.interiorColor ?? "",
    seats:
      listing.seats === null || listing.seats === undefined
        ? ""
        : String(listing.seats),
    doors:
      listing.doors === null || listing.doors === undefined
        ? ""
        : String(listing.doors),
    drivetrain: listing.drivetrain ?? "",
    assemblyType: listing.assemblyType ?? "",
    price: String(car.price),
    condition: car.condition,
    showroomLocation: listing.showroomLocation ?? "",
    description: car.description,
    features: car.features.join("\n"),
    status: car.status,
    // Existing records predate the visibility field and were already public.
    isPublished: listing.isPublished ?? true,
    images: car.images.map((image, index) => ({
      url: image.url,
      publicId: image.publicId ?? null,
      altText: image.altText,
      width: image.width,
      height: image.height,
      sortOrder: index
    }))
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function CarForm({
  car,
  onCancel,
  onSaved
}: {
  car?: SerializedCar;
  onCancel: () => void;
  onSaved: (car: SerializedCar) => void;
}) {
  const initialState = useMemo(() => formFromCar(car), [car]);
  const [state, setState] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = JSON.stringify(state) !== JSON.stringify(initialState);
  const vehicleName = getVehicleName(state);
  const readiness = useMemo(
    () => assessListingReadiness(state, state.images),
    [state]
  );

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function requestCancel() {
    if (
      isDirty &&
      !window.confirm("Discard the unsaved changes to this vehicle?")
    ) {
      return;
    }

    onCancel();
  }

  function applyDescriptionTemplate(language: DescriptionLanguage) {
    if (
      state.description.trim() &&
      !window.confirm(
        "Replace the current description with a fact-only template built from the vehicle fields?"
      )
    ) {
      return;
    }

    setField("description", buildDescriptionTemplate(language, state));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (state.isPublished && !readiness.canPublish) {
      setError(
        "This listing is not ready for the public showroom. Complete the publish checks, or switch it to Draft before saving."
      );
      window.requestAnimationFrame(() => {
        document.getElementById("listing-readiness-panel")?.focus();
      });
      return;
    }

    const candidate = {
      ...state,
      stockCode: nullableText(state.stockCode),
      variant: nullableText(state.variant),
      registrationYear: nullableNumber(state.registrationYear),
      bodyType: nullableText(state.bodyType),
      exteriorColor: nullableText(state.exteriorColor),
      interiorColor: nullableText(state.interiorColor),
      engineCc: nullableNumber(state.engineCc),
      seats: nullableNumber(state.seats),
      doors: nullableNumber(state.doors),
      drivetrain: nullableText(state.drivetrain),
      assemblyType: nullableText(state.assemblyType),
      showroomLocation: nullableText(state.showroomLocation),
      features: state.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
      images: state.images.map((image, index) => ({
        ...image,
        sortOrder: index
      }))
    };
    const validation = carInputSchema.safeParse(candidate);

    if (!validation.success) {
      const nextErrors: FieldErrors = {};

      validation.error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? "form");
        nextErrors[field] ??= issue.message;
      });

      setFieldErrors(nextErrors);
      setError("Review the highlighted fields before saving this vehicle.");

      const firstField = String(validation.error.issues[0]?.path[0] ?? "");
      window.requestAnimationFrame(() => {
        document.getElementById(`vehicle-field-${firstField}`)?.focus();
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const savedCar = await adminFetch<SerializedCar>(
        car ? `/api/admin/cars/${car.id}` : "/api/admin/cars",
        {
          method: car ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data)
        },
        "Vehicle could not be saved."
      );
      onSaved(savedCar);
    } catch (requestError) {
      setError(errorMessage(requestError, "Vehicle could not be saved."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isSubmitting}
      noValidate
      className="overflow-hidden border border-ink/20 bg-smoke"
    >
      <header className="flex items-start justify-between gap-4 border-b border-ink/10 bg-ink px-4 py-4 text-white sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-signal">
              {car ? "Edit listing" : "New listing"}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                state.isPublished
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "bg-white/10 text-white/65"
              )}
            >
              {state.isPublished ? (
                <Eye className="h-3 w-3" aria-hidden="true" />
              ) : (
                <EyeOff className="h-3 w-3" aria-hidden="true" />
              )}
              {state.isPublished ? "Public" : "Draft"}
            </span>
          </div>
          <h2
            id="vehicle-form-heading"
            tabIndex={-1}
            className="mt-1 font-display text-2xl font-black uppercase leading-none tracking-[-0.02em] outline-none"
          >
            {vehicleName || "Add a vehicle"}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Build a complete Malaysian used-car listing before it goes live.
          </p>
        </div>
        <button
          type="button"
          onClick={requestCancel}
          disabled={isSubmitting}
          className="grid h-11 w-11 shrink-0 place-items-center border border-white/15 text-white/75 outline-none transition hover:border-white/35 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white/50 disabled:opacity-45"
          aria-label="Close vehicle form"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="p-4 sm:p-5">
        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 flex items-start gap-3 border border-red-200 border-l-4 border-l-signal bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {error}
          </div>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-5">
            <FormSection
              title="Showroom control"
              description="Choose who can see the listing, then set its stock status and viewing location."
              disabled={isSubmitting}
            >
              <div
                role="radiogroup"
                aria-label="Showroom visibility"
                className="grid gap-3 sm:grid-cols-2"
              >
                <VisibilityOption
                  checked={!state.isPublished}
                  title="Draft"
                  description="Hidden from customers. Use this while details and photos are being prepared."
                  icon={<EyeOff className="h-5 w-5" aria-hidden="true" />}
                  onChange={() => setField("isPublished", false)}
                />
                <VisibilityOption
                  checked={state.isPublished}
                  title="Public showroom"
                  description={
                    readiness.canPublish
                      ? "Visible to customers and included in showroom browsing and search."
                      : `Complete ${readiness.blockers.length} publish ${readiness.blockers.length === 1 ? "check" : "checks"} in the quality panel first.`
                  }
                  icon={<Eye className="h-5 w-5" aria-hidden="true" />}
                  onChange={() => setField("isPublished", true)}
                  disabled={!readiness.canPublish && !state.isPublished}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextField
                  name="stockCode"
                  label="Stock code"
                  value={state.stockCode}
                  onChange={(value) => setField("stockCode", value)}
                  error={fieldErrors.stockCode}
                  placeholder="e.g. PM-24058"
                  help="Your internal stock or unit reference."
                  required={false}
                />
                <SelectField
                  name="status"
                  label="Stock status"
                  value={state.status}
                  options={statuses}
                  onChange={(value) => setField("status", value as CarStatus)}
                  error={fieldErrors.status}
                  help="Reserved and sold units remain clearly labelled."
                />
                <TextField
                  name="showroomLocation"
                  label="Viewing location"
                  value={state.showroomLocation}
                  onChange={(value) => setField("showroomLocation", value)}
                  error={fieldErrors.showroomLocation}
                  placeholder="e.g. Petaling Jaya, Selangor"
                  list="vehicle-location-options"
                  required={false}
                />
              </div>
            </FormSection>

            <FormSection
              title="Vehicle identity & registration"
              description="Use the wording found on the grant, registration card, or auction sheet."
              disabled={isSubmitting}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TextField
                  name="brand"
                  label="Brand"
                  value={state.brand}
                  onChange={(value) => setField("brand", value)}
                  error={fieldErrors.brand}
                  placeholder="e.g. Toyota"
                  list="vehicle-brand-options"
                />
                <TextField
                  name="model"
                  label="Model"
                  value={state.model}
                  onChange={(value) => setField("model", value)}
                  error={fieldErrors.model}
                  placeholder="e.g. Corolla Cross"
                />
                <TextField
                  name="variant"
                  label="Variant / grade"
                  value={state.variant}
                  onChange={(value) => setField("variant", value)}
                  error={fieldErrors.variant}
                  placeholder="e.g. 1.8V AT"
                  list="vehicle-variant-options"
                  required={false}
                />
                <TextField
                  name="bodyType"
                  label="Body type"
                  value={state.bodyType}
                  onChange={(value) => setField("bodyType", value)}
                  error={fieldErrors.bodyType}
                  placeholder="e.g. SUV"
                  list="vehicle-body-options"
                  required={false}
                />
                <NumberField
                  name="year"
                  label="Manufacturing year"
                  value={state.year}
                  onChange={(value) => setField("year", value)}
                  error={fieldErrors.year}
                  min={1970}
                  max={currentYear + 1}
                  inputMode="numeric"
                />
                <NumberField
                  name="registrationYear"
                  label="Registration year"
                  value={state.registrationYear}
                  onChange={(value) => setField("registrationYear", value)}
                  error={fieldErrors.registrationYear}
                  min={1970}
                  max={currentYear + 1}
                  inputMode="numeric"
                  help="First Malaysian registration year, if known."
                  required={false}
                />
                <TextField
                  name="condition"
                  label="Condition"
                  value={state.condition}
                  onChange={(value) => setField("condition", value)}
                  error={fieldErrors.condition}
                  placeholder="e.g. Excellent"
                  list="vehicle-condition-options"
                />
                <TextField
                  name="assemblyType"
                  label="Assembly / import type"
                  value={state.assemblyType}
                  onChange={(value) => setField("assemblyType", value)}
                  error={fieldErrors.assemblyType}
                  placeholder="e.g. Local assembled (CKD)"
                  list="vehicle-assembly-options"
                  required={false}
                />
              </div>
            </FormSection>

            <FormSection
              title="Mechanical & body specifications"
              description="Accurate structured details make search, comparison, and buyer enquiries more useful."
              disabled={isSubmitting}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <NumberField
                  name="mileage"
                  label="Mileage"
                  value={state.mileage}
                  onChange={(value) => setField("mileage", value)}
                  error={fieldErrors.mileage}
                  min={0}
                  max={2_000_000}
                  suffix="km"
                  inputMode="numeric"
                />
                <SelectField
                  name="transmission"
                  label="Transmission"
                  value={state.transmission}
                  options={transmissions}
                  onChange={(value) =>
                    setField("transmission", value as Transmission)
                  }
                  error={fieldErrors.transmission}
                />
                <SelectField
                  name="fuelType"
                  label="Fuel type"
                  value={state.fuelType}
                  options={fuelTypes}
                  onChange={(value) => setField("fuelType", value as FuelType)}
                  error={fieldErrors.fuelType}
                />
                <TextField
                  name="engine"
                  label="Engine description"
                  value={state.engine}
                  onChange={(value) => setField("engine", value)}
                  error={fieldErrors.engine}
                  placeholder="e.g. 1.5L Turbo"
                  list="vehicle-engine-options"
                />
                <NumberField
                  name="engineCc"
                  label="Engine capacity"
                  value={state.engineCc}
                  onChange={(value) => setField("engineCc", value)}
                  error={fieldErrors.engineCc}
                  min={0}
                  max={10000}
                  suffix="cc"
                  inputMode="numeric"
                  required={false}
                />
                <TextField
                  name="drivetrain"
                  label="Drivetrain"
                  value={state.drivetrain}
                  onChange={(value) => setField("drivetrain", value)}
                  error={fieldErrors.drivetrain}
                  placeholder="e.g. Front-wheel drive (FWD)"
                  list="vehicle-drivetrain-options"
                  required={false}
                />
                <NumberField
                  name="seats"
                  label="Seats"
                  value={state.seats}
                  onChange={(value) => setField("seats", value)}
                  error={fieldErrors.seats}
                  min={1}
                  max={20}
                  inputMode="numeric"
                  required={false}
                />
                <NumberField
                  name="doors"
                  label="Doors"
                  value={state.doors}
                  onChange={(value) => setField("doors", value)}
                  error={fieldErrors.doors}
                  min={1}
                  max={8}
                  inputMode="numeric"
                  required={false}
                />
                <TextField
                  name="exteriorColor"
                  label="Exterior colour"
                  value={state.exteriorColor}
                  onChange={(value) => setField("exteriorColor", value)}
                  error={fieldErrors.exteriorColor}
                  placeholder="e.g. Pearl White"
                  list="vehicle-colour-options"
                  required={false}
                />
                <TextField
                  name="interiorColor"
                  label="Interior colour"
                  value={state.interiorColor}
                  onChange={(value) => setField("interiorColor", value)}
                  error={fieldErrors.interiorColor}
                  placeholder="e.g. Black"
                  list="vehicle-colour-options"
                  required={false}
                />
              </div>
            </FormSection>

            <FormSection
              title="Price"
              description="Use the advertised cash price before financing, insurance, and ownership-transfer costs."
              disabled={isSubmitting}
            >
              <div className="max-w-md">
                <NumberField
                  name="price"
                  label="Advertised price"
                  value={state.price}
                  onChange={(value) => setField("price", value)}
                  error={fieldErrors.price}
                  min={1}
                  step={100}
                  prefix="RM"
                  inputMode="decimal"
                  help="Enter the vehicle price only; do not enter a monthly instalment."
                />
              </div>
            </FormSection>

            <FormSection
              title="Description & verified equipment"
              description="Write customer-friendly copy, but include only details you can verify from the vehicle or its documents."
              disabled={isSubmitting}
            >
              <div className="border border-signal/25 border-l-4 border-l-signal bg-white p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-black text-ink">Fact-only description starter</p>
                  <p className="mt-1 text-xs leading-5 text-ink/65">
                    Uses only the entered specifications and equipment. It never adds ownership,
                    accident, service-history, warranty, or certification claims.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => applyDescriptionTemplate("en")}
                    className="inline-flex h-10 items-center gap-2 border border-ink/20 bg-white px-3 text-xs font-black uppercase tracking-wide text-ink outline-none transition hover:border-signal hover:text-signal focus:ring-2 focus:ring-signal/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    English template
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDescriptionTemplate("ms")}
                    className="inline-flex h-10 items-center gap-2 border border-ink/20 bg-white px-3 text-xs font-black uppercase tracking-wide text-ink outline-none transition hover:border-signal hover:text-signal focus:ring-2 focus:ring-signal/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Templat Bahasa Melayu
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <TextAreaField
                  name="description"
                  label="Vehicle description"
                  value={state.description}
                  onChange={(value) => setField("description", value)}
                  error={fieldErrors.description}
                  help={`${state.description.trim().length} characters · aim for at least 180 factual characters.`}
                  placeholder="Describe the vehicle using verified facts, its key specifications, and viewing details."
                  rows={10}
                />
                <TextAreaField
                  name="features"
                  label="Features & equipment"
                  value={state.features}
                  onChange={(value) => setField("features", value)}
                  error={fieldErrors.features}
                  help="Add one verified feature per line so every item is easy to scan."
                  placeholder={"Adaptive cruise control\n360-degree camera\nWireless Apple CarPlay\nPowered tailgate\nBlind-spot monitor\nLeather seats"}
                  rows={10}
                />
              </div>
            </FormSection>

            <FormSection
              title="Vehicle gallery"
              description="Add up to 21 genuine photos. Put the strongest front three-quarter view first, then exterior, interior, odometer, engine bay, boot, wheels, and any visible defects."
              disabled={isSubmitting}
            >
              <div
                id="vehicle-field-images"
                tabIndex={fieldErrors.images ? -1 : undefined}
                className={cn(
                  "outline-none",
                  fieldErrors.images && "ring-2 ring-red-300 ring-offset-2"
                )}
              >
                <ImageDropzone
                  images={state.images}
                  onChange={(images) => setField("images", images)}
                  fieldError={fieldErrors.images}
                  vehicleName={vehicleName}
                />
              </div>
            </FormSection>
          </div>

          <ListingReadinessPanel
            readiness={readiness}
            isPublished={state.isPublished}
          />
        </div>

        <ListingDatalists />

        <div className="sticky bottom-3 z-10 mt-5 flex flex-col gap-3 border border-ink/20 border-l-4 border-l-signal bg-white/95 p-3 shadow-[0_12px_30px_rgba(9,9,9,0.10)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-ink">
              {isDirty ? "Unsaved listing changes" : "All changes saved"}
            </p>
            <p className="mt-0.5 text-[11px] text-ink/55">
              {state.isPublished && !readiness.canPublish
                ? "Complete the publish checks or switch to Draft before saving."
                : "Saving a draft keeps it hidden; public listings appear in the customer showroom."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={requestCancel}
              disabled={isSubmitting}
              className="focus:outline-none focus:ring-2 focus:ring-ink/20 focus:ring-offset-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              icon={
                isSubmitting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )
              }
              className="focus:outline-none focus:ring-2 focus:ring-ink/25 focus:ring-offset-2"
            >
              {isSubmitting
                ? "Saving vehicle..."
                : state.isPublished
                  ? "Save public listing"
                  : "Save draft"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  title,
  description,
  disabled,
  children
}: {
  title: string;
  description: string;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="border border-ink/15 bg-white p-4 sm:p-5"
    >
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 border-b border-ink/10 pb-4">
        <h3 className="font-display text-lg font-black uppercase leading-none tracking-[0.01em] text-ink">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
      </div>
      {children}
    </fieldset>
  );
}

function VisibilityOption({
  checked,
  title,
  description,
  icon,
  onChange,
  disabled = false
}: {
  checked: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-28 items-start gap-3 border p-4 outline-none transition focus-within:ring-2 focus-within:ring-signal/20",
        disabled
          ? "cursor-not-allowed border-ink/10 bg-smoke opacity-60"
          : checked
            ? "cursor-pointer border-signal bg-signal/5"
            : "cursor-pointer border-ink/15 bg-smoke hover:border-ink/30"
      )}
    >
      <input
        type="radio"
        name="showroomVisibility"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center border",
          checked ? "border-signal bg-signal text-white" : "border-ink/15 bg-white text-ink/55"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="flex items-center gap-2 text-sm font-black text-ink">
          {title}
          {checked ? (
            <span className="border border-signal/30 bg-signal/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-signal">
              Selected
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-ink/60">{description}</span>
      </span>
    </label>
  );
}

function FieldLabel({
  label,
  required = true
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <span className="flex items-center justify-between gap-2 text-sm font-bold text-ink">
      {label}
      <span
        className={cn(
          "text-[10px] font-black uppercase tracking-[0.12em]",
          required ? "text-ink/55" : "text-ink/40"
        )}
      >
        {required ? "Required" : "Optional"}
      </span>
    </span>
  );
}

function FieldHelp({
  id,
  help,
  error
}: {
  id: string;
  help?: string;
  error?: string;
}) {
  if (error) {
    return (
      <span id={`${id}-error`} className="mt-1.5 block text-xs font-bold text-red-700">
        {error}
      </span>
    );
  }

  return help ? (
    <span id={`${id}-help`} className="mt-1.5 block text-xs leading-5 text-ink/60">
      {help}
    </span>
  ) : null;
}

function TextField({
  name,
  label,
  value,
  onChange,
  error,
  help,
  placeholder,
  list,
  required = true
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  placeholder?: string;
  list?: string;
  required?: boolean;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} required={required} />
      <input
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        list={list}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(inputClassName, error && "border-red-400 ring-1 ring-red-200")}
      />
      <FieldHelp id={id} help={help} error={error} />
    </label>
  );
}

function NumberField({
  name,
  label,
  value,
  onChange,
  error,
  help,
  min,
  max,
  step,
  prefix,
  suffix,
  inputMode,
  required = true
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  inputMode?: "numeric" | "decimal";
  required?: boolean;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} required={required} />
      <span className="relative mt-2 block">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-3 text-sm font-bold text-ink/60">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          required={required}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          className={cn(
            inputClassName,
            "mt-0",
            prefix && "pl-12",
            suffix && "pr-12",
            error && "border-red-400 ring-1 ring-red-200"
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-3 text-sm font-bold text-ink/60">
            {suffix}
          </span>
        ) : null}
      </span>
      <FieldHelp id={id} help={help} error={error} />
    </label>
  );
}

function SelectField({
  name,
  label,
  value,
  options,
  onChange,
  error,
  help,
  required = true
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  required?: boolean;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} required={required} />
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(inputClassName, error && "border-red-400 ring-1 ring-red-200")}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCaseEnum(option)}
          </option>
        ))}
      </select>
      <FieldHelp id={id} help={help} error={error} />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  value,
  onChange,
  error,
  help,
  placeholder,
  rows,
  required = true
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  placeholder?: string;
  rows: number;
  required?: boolean;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} required={required} />
      <textarea
        id={id}
        name={name}
        required={required}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(
          inputClassName,
          "h-auto resize-y py-3 leading-6",
          error && "border-red-400 ring-1 ring-red-200"
        )}
      />
      <FieldHelp id={id} help={help} error={error} />
    </label>
  );
}

function ListingDatalists() {
  return (
    <>
      <datalist id="vehicle-brand-options">
        {[
          "Perodua",
          "Proton",
          "Toyota",
          "Honda",
          "Nissan",
          "Mazda",
          "Mitsubishi",
          "Isuzu",
          "Subaru",
          "BMW",
          "Mercedes-Benz",
          "Lexus",
          "Volvo",
          "Volkswagen",
          "Audi",
          "MINI",
          "Kia",
          "Hyundai",
          "Ford",
          "Porsche"
        ].map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="vehicle-variant-options">
        {[
          "1.0 G",
          "1.0 AV",
          "1.5 X",
          "1.5 H",
          "1.5 AV",
          "1.5 TC-P",
          "1.8 E",
          "1.8 V",
          "2.0 RS",
          "M Sport",
          "AMG Line",
          "Avantgarde",
          "Executive",
          "Highline",
          "Premium"
        ].map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="vehicle-body-options">
        {[
          "Sedan",
          "Hatchback",
          "SUV",
          "MPV",
          "Pickup truck",
          "Coupe",
          "Convertible",
          "Wagon",
          "Van"
        ].map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="vehicle-condition-options">
        <option value="Excellent" />
        <option value="Very good" />
        <option value="Good" />
        <option value="Fair" />
      </datalist>
      <datalist id="vehicle-assembly-options">
        <option value="Local assembled (CKD)" />
        <option value="Fully imported (CBU)" />
        <option value="Reconditioned import (Recon)" />
      </datalist>
      <datalist id="vehicle-engine-options">
        <option value="1.0L" />
        <option value="1.0L Turbo" />
        <option value="1.3L" />
        <option value="1.5L" />
        <option value="1.5L Turbo" />
        <option value="1.8L" />
        <option value="2.0L" />
        <option value="2.0L Turbo" />
        <option value="2.5L Hybrid" />
        <option value="Electric motor" />
      </datalist>
      <datalist id="vehicle-drivetrain-options">
        <option value="Front-wheel drive (FWD)" />
        <option value="Rear-wheel drive (RWD)" />
        <option value="All-wheel drive (AWD)" />
        <option value="Four-wheel drive (4WD)" />
      </datalist>
      <datalist id="vehicle-colour-options">
        {[
          "White",
          "Pearl White",
          "Black",
          "Silver",
          "Grey",
          "Blue",
          "Red",
          "Brown",
          "Beige",
          "Green",
          "Orange",
          "Gold"
        ].map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="vehicle-location-options">
        {[
          "Kuala Lumpur",
          "Petaling Jaya, Selangor",
          "Puchong, Selangor",
          "Shah Alam, Selangor",
          "Klang, Selangor",
          "Cheras, Kuala Lumpur",
          "Kajang, Selangor",
          "Seremban, Negeri Sembilan",
          "Johor Bahru, Johor",
          "George Town, Penang",
          "Ipoh, Perak",
          "Melaka"
        ].map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  );
}

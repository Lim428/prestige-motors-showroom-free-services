"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import type { CarStatus, FuelType, Transmission } from "@prisma/client";
import type { SerializedCar } from "@/lib/cars";
import { Button } from "@/components/ui/Button";
import { ImageDropzone, type EditableImage } from "@/components/admin/ImageDropzone";
import { adminFetch } from "@/components/admin/adminFetch";
import { titleCaseEnum } from "@/lib/format";
import { carInputSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

const fuelTypes: FuelType[] = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"];
const transmissions: Transmission[] = ["AUTOMATIC", "MANUAL"];
const statuses: CarStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];
const currentYear = new Date().getFullYear();

type FormState = {
  brand: string;
  model: string;
  year: string;
  mileage: string;
  transmission: Transmission;
  fuelType: FuelType;
  engine: string;
  price: string;
  condition: string;
  description: string;
  features: string;
  status: CarStatus;
  images: EditableImage[];
};

type FieldErrors = Record<string, string>;

const inputClassName =
  "mt-2 h-11 w-full rounded-md border border-ink/15 bg-smoke px-3 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/15";

function emptyForm(): FormState {
  return {
    brand: "",
    model: "",
    year: String(currentYear),
    mileage: "",
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "",
    price: "",
    condition: "Excellent",
    description: "",
    features: "",
    status: "AVAILABLE",
    images: []
  };
}

function formFromCar(car?: SerializedCar): FormState {
  if (!car) {
    return emptyForm();
  }

  return {
    brand: car.brand,
    model: car.model,
    year: String(car.year),
    mileage: String(car.mileage),
    transmission: car.transmission,
    fuelType: car.fuelType,
    engine: car.engine,
    price: String(car.price),
    condition: car.condition,
    description: car.description,
    features: car.features.join("\n"),
    status: car.status,
    images: car.images.map((image, index) => ({
      url: image.url,
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const candidate = {
      ...state,
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
      className="overflow-hidden rounded-md border border-ink/15 bg-white shadow-panel"
    >
      <header className="flex items-start justify-between gap-4 border-b border-ink/10 bg-ink px-4 py-4 text-white sm:px-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-champagne">
            {car ? "Edit listing" : "New listing"}
          </p>
          <h2
            id="vehicle-form-heading"
            tabIndex={-1}
            className="mt-1 text-xl font-black outline-none"
          >
            {car ? `${car.year} ${car.brand} ${car.model}` : "Add a vehicle"}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Fields marked required must be completed before publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={requestCancel}
          disabled={isSubmitting}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-white/75 outline-none transition hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white/50 disabled:opacity-45"
          aria-label="Close vehicle form"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="grid gap-5 p-4 sm:p-5">
        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {error}
          </div>
        ) : null}

        <fieldset disabled={isSubmitting}>
          <legend className="text-base font-black text-ink">
            Vehicle identity
          </legend>
          <p className="mt-1 text-sm text-ink/65">
            The essential information customers use to recognise the listing.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              name="brand"
              label="Brand"
              value={state.brand}
              onChange={(value) => setField("brand", value)}
              error={fieldErrors.brand}
              placeholder="e.g. BMW"
            />
            <TextField
              name="model"
              label="Model"
              value={state.model}
              onChange={(value) => setField("model", value)}
              error={fieldErrors.model}
              placeholder="e.g. 530e M Sport"
            />
            <NumberField
              name="year"
              label="Year"
              value={state.year}
              onChange={(value) => setField("year", value)}
              error={fieldErrors.year}
              min={1970}
              max={currentYear + 1}
              inputMode="numeric"
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
          </div>
          <datalist id="vehicle-condition-options">
            <option value="Certified excellent" />
            <option value="Excellent" />
            <option value="Very good" />
            <option value="Good" />
          </datalist>
        </fieldset>

        <div className="border-t border-ink/10" />

        <fieldset disabled={isSubmitting}>
          <legend className="text-base font-black text-ink">
            Specifications
          </legend>
          <p className="mt-1 text-sm text-ink/65">
            Use kilometres and the exact engine description shown in the records.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              label="Engine"
              value={state.engine}
              onChange={(value) => setField("engine", value)}
              error={fieldErrors.engine}
              placeholder="e.g. 2.0L Hybrid"
            />
          </div>
        </fieldset>

        <div className="border-t border-ink/10" />

        <fieldset disabled={isSubmitting}>
          <legend className="text-base font-black text-ink">
            Pricing and availability
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField
              name="price"
              label="Price"
              value={state.price}
              onChange={(value) => setField("price", value)}
              error={fieldErrors.price}
              min={1}
              step={100}
              prefix="RM"
              inputMode="decimal"
              help="Enter the advertised price before financing."
            />
            <SelectField
              name="status"
              label="Listing status"
              value={state.status}
              options={statuses}
              onChange={(value) => setField("status", value as CarStatus)}
              error={fieldErrors.status}
              help="Available listings appear as active showroom stock."
            />
          </div>
        </fieldset>

        <div className="border-t border-ink/10" />

        <fieldset disabled={isSubmitting}>
          <legend className="text-base font-black text-ink">Listing copy</legend>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TextAreaField
              name="description"
              label="Description"
              value={state.description}
              onChange={(value) => setField("description", value)}
              error={fieldErrors.description}
              help="Summarise history, condition, and what makes this car valuable."
              rows={7}
            />
            <TextAreaField
              name="features"
              label="Features"
              value={state.features}
              onChange={(value) => setField("features", value)}
              error={fieldErrors.features}
              help="Add one feature per line so each item displays cleanly."
              placeholder={"Adaptive cruise control\n360-degree camera\nWireless Apple CarPlay"}
              rows={7}
            />
          </div>
        </fieldset>

        <div className="border-t border-ink/10" />

        <fieldset disabled={isSubmitting}>
          <legend className="text-base font-black text-ink">Vehicle photos</legend>
          <p className="mt-1 text-sm text-ink/65">
            Add 1–12 photos. The first image becomes the showroom cover.
          </p>
          <div
            id="vehicle-field-images"
            tabIndex={fieldErrors.images ? -1 : undefined}
            className={cn(
              "mt-4 rounded-md outline-none",
              fieldErrors.images && "ring-2 ring-red-300 ring-offset-2"
            )}
          >
            <ImageDropzone
              images={state.images}
              onChange={(images) => setField("images", images)}
              fieldError={fieldErrors.images}
            />
          </div>
        </fieldset>

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-md border border-ink/10 bg-white/95 p-3 shadow-[0_14px_50px_rgba(17,17,17,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-ink/65">
            {isDirty ? "Unsaved changes" : "No changes yet"}
          </p>
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
              {isSubmitting ? "Saving vehicle..." : "Save vehicle"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-between gap-2 text-sm font-bold text-ink">
      {label}
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/55">
        Required
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
  list
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  placeholder?: string;
  list?: string;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} />
      <input
        id={id}
        name={name}
        required
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
  inputMode
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
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} />
      <span className="relative mt-2 block">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-3 text-sm font-bold text-ink/60">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          required
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
  help
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
  help?: string;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} />
      <select
        id={id}
        name={name}
        required
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
  rows
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  placeholder?: string;
  rows: number;
}) {
  const id = `vehicle-field-${name}`;

  return (
    <label htmlFor={id}>
      <FieldLabel label={label} />
      <textarea
        id={id}
        name={name}
        required
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

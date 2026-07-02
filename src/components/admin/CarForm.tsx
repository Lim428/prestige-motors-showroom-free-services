"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { Save, X } from "lucide-react";
import type { CarStatus, FuelType, Transmission } from "@prisma/client";
import type { SerializedCar } from "@/lib/cars";
import { Button } from "@/components/ui/Button";
import { titleCaseEnum } from "@/lib/format";
import { ImageDropzone, type EditableImage } from "@/components/admin/ImageDropzone";

const fuelTypes: FuelType[] = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"];
const transmissions: Transmission[] = ["AUTOMATIC", "MANUAL"];
const statuses: CarStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];

const emptyForm = {
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  mileage: 0,
  transmission: "AUTOMATIC" as Transmission,
  fuelType: "PETROL" as FuelType,
  engine: "",
  price: 0,
  condition: "Excellent",
  description: "",
  features: "",
  status: "AVAILABLE" as CarStatus,
  images: [] as EditableImage[]
};

type FormState = typeof emptyForm;

function formFromCar(car?: SerializedCar): FormState {
  if (!car) {
    return emptyForm;
  }

  return {
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    transmission: car.transmission,
    fuelType: car.fuelType,
    engine: car.engine,
    price: car.price,
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
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = {
      ...state,
      features: state.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
      images: state.images.map((image, index) => ({ ...image, sortOrder: index }))
    };

    startTransition(async () => {
      const response = await fetch(car ? `/api/admin/cars/${car.id}` : "/api/admin/cars", {
        method: car ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { data?: SerializedCar; error?: string };

      if (!response.ok || !result.data) {
        setError(result.error ?? "Vehicle could not be saved.");
        return;
      }

      onSaved(result.data);
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-ink/10 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-ink">{car ? "Edit vehicle" : "Add vehicle"}</h2>
          <p className="text-sm text-ink/55">
            {car ? `${car.year} ${car.brand} ${car.model}` : "Create a new showroom listing"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-10 w-10 place-items-center rounded-md text-ink/55 transition hover:bg-ink/5 hover:text-ink"
          aria-label="Close form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TextField label="Brand" value={state.brand} onChange={(value) => setField("brand", value)} />
        <TextField label="Model" value={state.model} onChange={(value) => setField("model", value)} />
        <NumberField label="Year" value={state.year} onChange={(value) => setField("year", value)} />
        <NumberField label="Mileage" value={state.mileage} onChange={(value) => setField("mileage", value)} />
        <SelectField
          label="Transmission"
          value={state.transmission}
          options={transmissions}
          onChange={(value) => setField("transmission", value as Transmission)}
        />
        <SelectField
          label="Fuel type"
          value={state.fuelType}
          options={fuelTypes}
          onChange={(value) => setField("fuelType", value as FuelType)}
        />
        <TextField label="Engine" value={state.engine} onChange={(value) => setField("engine", value)} />
        <NumberField label="Price" value={state.price} onChange={(value) => setField("price", value)} />
        <TextField label="Condition" value={state.condition} onChange={(value) => setField("condition", value)} />
        <SelectField
          label="Status"
          value={state.status}
          options={statuses}
          onChange={(value) => setField("status", value as CarStatus)}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Description
          </span>
          <textarea
            required
            rows={5}
            value={state.description}
            onChange={(event) => setField("description", event.target.value)}
            className="mt-2 w-full rounded-md border border-ink/10 bg-smoke px-3 py-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Features
          </span>
          <textarea
            required
            rows={5}
            value={state.features}
            onChange={(event) => setField("features", event.target.value)}
            className="mt-2 w-full rounded-md border border-ink/10 bg-smoke px-3 py-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-5">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
          Images
        </span>
        <div className="mt-2">
          <ImageDropzone
            images={state.images}
            onChange={(images) => setField("images", images)}
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} icon={<Save className="h-4 w-4" />}>
          {isPending ? "Saving..." : "Save vehicle"}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
      <input
        required
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCaseEnum(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

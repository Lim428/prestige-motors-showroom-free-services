"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import type { CarStatus } from "@prisma/client";
import type { SerializedCar } from "@/lib/cars";
import type { AdminEnquiry } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CarForm } from "@/components/admin/CarForm";
import { EnquiryManager } from "@/components/admin/EnquiryManager";
import { formatMileage, titleCaseEnum } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type Tab = "inventory" | "enquiries";
const statuses: CarStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];

export function AdminDashboard({
  initialCars,
  initialEnquiries
}: {
  initialCars: SerializedCar[];
  initialEnquiries: AdminEnquiry[];
}) {
  const [cars, setCars] = useState(initialCars);
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [tab, setTab] = useState<Tab>("inventory");
  const [editingCar, setEditingCar] = useState<SerializedCar | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const available = cars.filter((car) => car.status === "AVAILABLE").length;
  const reserved = cars.filter((car) => car.status === "RESERVED").length;
  const sold = cars.filter((car) => car.status === "SOLD").length;
  const newEnquiries = enquiries.filter((enquiry) => enquiry.status === "NEW").length;

  function openCreate() {
    setEditingCar(undefined);
    setIsFormOpen(true);
  }

  function openEdit(car: SerializedCar) {
    setEditingCar(car);
    setIsFormOpen(true);
  }

  function onSaved(car: SerializedCar) {
    setCars((current) => {
      const exists = current.some((item) => item.id === car.id);
      return exists
        ? current.map((item) => (item.id === car.id ? car : item))
        : [car, ...current];
    });
    setIsFormOpen(false);
    setEditingCar(undefined);
  }

  function deleteCar(car: SerializedCar) {
    if (!window.confirm(`Delete ${car.year} ${car.brand} ${car.model}?`)) {
      return;
    }

    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/cars/${car.id}`, {
        method: "DELETE"
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Vehicle could not be deleted.");
        return;
      }

      setCars((current) => current.filter((item) => item.id !== car.id));
    });
  }

  function updateStatus(car: SerializedCar, status: CarStatus) {
    setError("");
    const payload = {
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
      features: car.features,
      status,
      images: car.images.map((image, index) => ({
        url: image.url,
        altText: image.altText,
        width: image.width,
        height: image.height,
        sortOrder: index
      }))
    };

    startTransition(async () => {
      const response = await fetch(`/api/admin/cars/${car.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { data?: SerializedCar; error?: string };

      if (!response.ok || !result.data) {
        setError(result.error ?? "Vehicle status could not be changed.");
        return;
      }

      setCars((current) =>
        current.map((item) => (item.id === car.id ? result.data! : item))
      );
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-copper">
            Admin dashboard
          </p>
          <h1 className="mt-2 text-4xl font-black text-ink">Dealership operations</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          icon={<LogOut className="h-4 w-4" />}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </Button>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Available", available],
          ["Reserved", reserved],
          ["Sold", sold],
          ["New enquiries", newEnquiries]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-ink/10 bg-white p-5 shadow-panel">
            <p className="text-3xl font-black text-ink">{value}</p>
            <p className="mt-1 text-sm text-ink/55">{label}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-md border border-ink/10 bg-white p-1 shadow-sm">
          {(["inventory", "enquiries"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded px-4 py-2 text-sm font-bold capitalize transition",
                tab === item ? "bg-ink text-white" : "text-ink/58 hover:bg-ink/5 hover:text-ink"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "inventory" ? (
          <Button type="button" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            Add car
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      {tab === "inventory" ? (
        <div className="mt-6 grid gap-6">
          {isFormOpen ? (
            <CarForm
              key={editingCar?.id ?? "new"}
              car={editingCar}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingCar(undefined);
              }}
              onSaved={onSaved}
            />
          ) : null}

          <section className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-panel">
            <div className="border-b border-ink/10 p-5">
              <h2 className="text-xl font-black text-ink">Inventory</h2>
              <p className="text-sm text-ink/55">{cars.length} vehicles in the database</p>
            </div>

            {cars.length > 0 ? (
              <div className="divide-y divide-ink/10">
                {cars.map((car) => (
                  <article
                    key={car.id}
                    className="grid gap-4 p-4 transition hover:bg-smoke/70 lg:grid-cols-[120px_minmax(0,1fr)_auto]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
                      {car.images[0] ? (
                        <Image
                          src={runtimeImageUrl(car.images[0].url)}
                          alt={car.images[0].altText}
                          fill
                          unoptimized={isRuntimeImage(car.images[0].url)}
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-ink">
                          {car.year} {car.brand} {car.model}
                        </h3>
                        <StatusBadge status={car.status} />
                      </div>
                      <p className="mt-2 text-sm text-ink/60">
                        {car.formattedPrice} · {formatMileage(car.mileage)} ·{" "}
                        {titleCaseEnum(car.transmission)} · {titleCaseEnum(car.fuelType)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/55">
                        {car.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <select
                        value={car.status}
                        disabled={isPending}
                        onChange={(event) =>
                          updateStatus(car, event.target.value as CarStatus)
                        }
                        className="h-10 rounded-md border border-ink/10 bg-white px-3 text-sm outline-none focus:border-ink/35"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {titleCaseEnum(status)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openEdit(car)}
                        className="grid h-10 w-10 place-items-center rounded-md text-ink/60 transition hover:bg-ink/5 hover:text-ink"
                        aria-label="Edit vehicle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCar(car)}
                        className="grid h-10 w-10 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                        aria-label="Delete vehicle"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-ink/55">
                No vehicles have been added yet.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="mt-6">
          <EnquiryManager enquiries={enquiries} onChange={setEnquiries} />
        </div>
      )}
    </main>
  );
}

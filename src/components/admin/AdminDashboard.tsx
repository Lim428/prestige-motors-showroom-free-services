"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  CarFront,
  CircleCheckBig,
  Clock3,
  ExternalLink,
  Inbox,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import type { CarStatus, EnquiryStatus } from "@prisma/client";
import type { SerializedCar } from "@/lib/cars";
import type { AdminEnquiry } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CarForm } from "@/components/admin/CarForm";
import { EnquiryManager } from "@/components/admin/EnquiryManager";
import { adminFetch } from "@/components/admin/adminFetch";
import { titleCaseEnum } from "@/lib/format";
import { isRuntimeImage, runtimeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type Tab = "inventory" | "enquiries";
type InventoryStatusFilter = "ALL" | CarStatus;
type EnquiryStatusFilter = "ALL" | EnquiryStatus;

const carStatuses: CarStatus[] = ["AVAILABLE", "RESERVED", "SOLD"];
const number = new Intl.NumberFormat("en-MY");

const controlClassName =
  "h-11 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15";
const iconButtonClassName =
  "grid h-11 w-11 shrink-0 place-items-center rounded-md border border-transparent outline-none transition focus:ring-2 focus:ring-ink/25 focus:ring-offset-2";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatAdminMileage(value: number) {
  return `${number.format(value)} km`;
}

export function AdminDashboard({
  initialCars,
  initialEnquiries,
  adminName
}: {
  initialCars: SerializedCar[];
  initialEnquiries: AdminEnquiry[];
  adminName: string;
}) {
  const [cars, setCars] = useState(initialCars);
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [tab, setTab] = useState<Tab>("inventory");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryStatus, setInventoryStatus] =
    useState<InventoryStatusFilter>("ALL");
  const [enquiryStatus, setEnquiryStatus] =
    useState<EnquiryStatusFilter>("ALL");
  const [editingCar, setEditingCar] = useState<SerializedCar | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingCarIds, setPendingCarIds] = useState<Set<string>>(new Set());
  const [carErrors, setCarErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const available = cars.filter((car) => car.status === "AVAILABLE").length;
  const reserved = cars.filter((car) => car.status === "RESERVED").length;
  const sold = cars.filter((car) => car.status === "SOLD").length;
  const newEnquiries = enquiries.filter((enquiry) => enquiry.status === "NEW").length;

  const filteredCars = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();

    return cars.filter((car) => {
      const matchesStatus =
        inventoryStatus === "ALL" || car.status === inventoryStatus;
      const searchable = [
        car.year,
        car.brand,
        car.model,
        car.engine,
        car.condition,
        car.transmission,
        car.fuelType
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [cars, inventoryQuery, inventoryStatus]);

  function setCarPending(carId: string, isPending: boolean) {
    setPendingCarIds((current) => {
      const next = new Set(current);

      if (isPending) {
        next.add(carId);
      } else {
        next.delete(carId);
      }

      return next;
    });
  }

  function clearCarError(carId: string) {
    setCarErrors((current) => {
      if (!current[carId]) {
        return current;
      }

      const next = { ...current };
      delete next[carId];
      return next;
    });
  }

  function focusVehicleForm() {
    window.requestAnimationFrame(() => {
      const heading = document.getElementById("vehicle-form-heading");
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    });
  }

  function openCreate() {
    setEditingCar(undefined);
    setIsFormOpen(true);
    focusVehicleForm();
  }

  function openEdit(car: SerializedCar) {
    setEditingCar(car);
    setIsFormOpen(true);
    focusVehicleForm();
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingCar(undefined);
  }

  function onSaved(car: SerializedCar) {
    setCars((current) => {
      const exists = current.some((item) => item.id === car.id);
      return exists
        ? current.map((item) => (item.id === car.id ? car : item))
        : [car, ...current];
    });
    closeForm();
    setLiveMessage(
      `${car.year} ${car.brand} ${car.model} was saved successfully.`
    );
  }

  async function updateStatus(car: SerializedCar, status: CarStatus) {
    if (status === car.status || pendingCarIds.has(car.id)) {
      return;
    }

    const previousStatus = car.status;
    clearCarError(car.id);
    setLiveMessage("");
    setCarPending(car.id, true);
    setCars((current) =>
      current.map((item) => (item.id === car.id ? { ...item, status } : item))
    );

    try {
      const updatedCar = await adminFetch<SerializedCar>(
        `/api/admin/cars/${car.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        },
        "Vehicle status could not be changed."
      );

      setCars((current) =>
        current.map((item) => (item.id === car.id ? updatedCar : item))
      );
      setLiveMessage(
        `${car.year} ${car.brand} ${car.model} is now ${titleCaseEnum(status)}.`
      );
    } catch (error) {
      setCars((current) =>
        current.map((item) =>
          item.id === car.id ? { ...item, status: previousStatus } : item
        )
      );
      setCarErrors((current) => ({
        ...current,
        [car.id]: errorMessage(
          error,
          "Vehicle status could not be changed."
        )
      }));
    } finally {
      setCarPending(car.id, false);
    }
  }

  async function deleteCar(car: SerializedCar) {
    if (pendingCarIds.has(car.id)) {
      return;
    }

    clearCarError(car.id);
    setLiveMessage("");
    setCarPending(car.id, true);

    try {
      await adminFetch<{ id: string }>(
        `/api/admin/cars/${car.id}`,
        { method: "DELETE" },
        "Vehicle could not be deleted."
      );
      setCars((current) => current.filter((item) => item.id !== car.id));
      setConfirmDeleteId(null);
      setLiveMessage(`${car.year} ${car.brand} ${car.model} was deleted.`);
    } catch (error) {
      setCarErrors((current) => ({
        ...current,
        [car.id]: errorMessage(error, "Vehicle could not be deleted.")
      }));
    } finally {
      setCarPending(car.id, false);
    }
  }

  function showInventory(status: InventoryStatusFilter) {
    setTab("inventory");
    setInventoryStatus(status);
  }

  function showNewEnquiries() {
    setTab("enquiries");
    setEnquiryStatus("NEW");
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <main
      id="admin-content"
      className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8"
    >
      <div className="rounded-md bg-ink px-4 py-4 text-white shadow-panel sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white text-sm font-black text-ink">
              PM
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.14em]">
                Prestige Motors
              </p>
              <p className="truncate text-xs text-white/70">
                Dealership operations · {adminName}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="border border-white/15 text-white hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 sm:self-auto"
            icon={
              isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogOut className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>

      <header className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-copper">
            Live workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">
            Dealership overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Keep inventory accurate and follow every new customer enquiry.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="focus:outline-none focus:ring-2 focus:ring-ink/25 focus:ring-offset-2"
        >
          Add vehicle
        </Button>
      </header>

      <section
        aria-label="Dealership totals"
        className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <MetricButton
          label="Available"
          value={available}
          icon={<CircleCheckBig className="h-5 w-5" aria-hidden="true" />}
          active={tab === "inventory" && inventoryStatus === "AVAILABLE"}
          onClick={() => showInventory("AVAILABLE")}
        />
        <MetricButton
          label="Reserved"
          value={reserved}
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          active={tab === "inventory" && inventoryStatus === "RESERVED"}
          onClick={() => showInventory("RESERVED")}
        />
        <MetricButton
          label="Sold"
          value={sold}
          icon={<CarFront className="h-5 w-5" aria-hidden="true" />}
          active={tab === "inventory" && inventoryStatus === "SOLD"}
          onClick={() => showInventory("SOLD")}
        />
        <MetricButton
          label="New enquiries"
          value={newEnquiries}
          icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
          active={tab === "enquiries" && enquiryStatus === "NEW"}
          onClick={showNewEnquiries}
        />
      </section>

      <div className="mt-5 rounded-md border border-ink/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ink/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Admin workspace"
            className="grid grid-cols-2 rounded-md bg-smoke p-1"
          >
            <button
              id="inventory-tab"
              type="button"
              role="tab"
              aria-selected={tab === "inventory"}
              aria-controls="inventory-panel"
              onClick={() => setTab("inventory")}
              className={cn(
                "min-h-11 rounded px-4 text-sm font-bold outline-none transition focus:ring-2 focus:ring-ink/25",
                tab === "inventory"
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/70 hover:bg-white hover:text-ink"
              )}
            >
              Inventory
              <span className="ml-2 text-xs opacity-70">{cars.length}</span>
            </button>
            <button
              id="enquiries-tab"
              type="button"
              role="tab"
              aria-selected={tab === "enquiries"}
              aria-controls="enquiries-panel"
              onClick={() => setTab("enquiries")}
              className={cn(
                "min-h-11 rounded px-4 text-sm font-bold outline-none transition focus:ring-2 focus:ring-ink/25",
                tab === "enquiries"
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/70 hover:bg-white hover:text-ink"
              )}
            >
              Enquiries
              {newEnquiries > 0 ? (
                <span className="ml-2 rounded-full bg-copper px-2 py-0.5 text-[11px] text-white">
                  {newEnquiries} new
                </span>
              ) : null}
            </button>
          </div>
          <p className="px-1 text-xs font-semibold text-ink/60">
            Changes save immediately unless a form is open.
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </div>

        {tab === "inventory" ? (
          <section
            id="inventory-panel"
            role="tabpanel"
            aria-labelledby="inventory-tab"
            className="p-3 sm:p-4"
          >
            {isFormOpen ? (
              <div className="mb-4">
                <CarForm
                  key={editingCar?.id ?? "new"}
                  car={editingCar}
                  onCancel={closeForm}
                  onSaved={onSaved}
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-ink">Vehicle inventory</h2>
                <p className="mt-1 text-sm text-ink/65">
                  {filteredCars.length} of {cars.length} vehicles shown
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block min-w-0 sm:w-72">
                  <span className="sr-only">Search inventory</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/50"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={inventoryQuery}
                    onChange={(event) => setInventoryQuery(event.target.value)}
                    placeholder="Search make, model, year..."
                    className={`${controlClassName} w-full pl-9 pr-9`}
                  />
                  {inventoryQuery ? (
                    <button
                      type="button"
                      onClick={() => setInventoryQuery("")}
                      aria-label="Clear inventory search"
                      className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-ink/60 outline-none hover:bg-ink/5 focus:ring-2 focus:ring-ink/20"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </label>
                <label>
                  <span className="sr-only">Filter inventory by status</span>
                  <select
                    value={inventoryStatus}
                    onChange={(event) =>
                      setInventoryStatus(
                        event.target.value as InventoryStatusFilter
                      )
                    }
                    className={`${controlClassName} w-full sm:w-44`}
                  >
                    <option value="ALL">All statuses</option>
                    {carStatuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCaseEnum(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-ink/10">
              {filteredCars.length > 0 ? (
                <div className="divide-y divide-ink/10">
                  {filteredCars.map((car) => {
                    const isPending = pendingCarIds.has(car.id);
                    const isConfirmingDelete = confirmDeleteId === car.id;

                    return (
                      <article
                        key={car.id}
                        aria-busy={isPending}
                        className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 bg-white p-3 transition hover:bg-smoke/55 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4 xl:grid-cols-[104px_minmax(0,1fr)_auto] xl:items-center"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
                          {car.images[0] ? (
                            <Image
                              src={runtimeImageUrl(car.images[0].url)}
                              alt={car.images[0].altText}
                              fill
                              unoptimized={isRuntimeImage(car.images[0].url)}
                              sizes="104px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-ink/35">
                              <CarFront className="h-5 w-5" aria-hidden="true" />
                              <span className="sr-only">No image</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-black text-ink sm:text-lg">
                              {car.year} {car.brand} {car.model}
                            </h3>
                            <StatusBadge status={car.status} />
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-ink/75">
                            {car.formattedPrice}
                            <span aria-hidden="true"> · </span>
                            {formatAdminMileage(car.mileage)}
                          </p>
                          <p className="mt-1 truncate text-xs text-ink/65">
                            {titleCaseEnum(car.transmission)}
                            <span aria-hidden="true"> · </span>
                            {titleCaseEnum(car.fuelType)}
                            <span aria-hidden="true"> · </span>
                            {car.condition}
                          </p>
                          {carErrors[car.id] ? (
                            <p
                              role="alert"
                              className="mt-2 text-sm font-semibold text-red-700"
                            >
                              {carErrors[car.id]}
                            </p>
                          ) : null}
                        </div>

                        <div className="col-span-2 flex flex-wrap items-center gap-2 sm:pl-[120px] xl:col-span-1 xl:justify-end xl:pl-0">
                          {isPending ? (
                            <span className="inline-flex items-center gap-2 px-2 text-xs font-bold text-ink/60">
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                              Saving
                            </span>
                          ) : null}
                          <label>
                            <span className="sr-only">
                              Status for {car.year} {car.brand} {car.model}
                            </span>
                            <select
                              value={car.status}
                              disabled={isPending}
                              onChange={(event) =>
                                updateStatus(
                                  car,
                                  event.target.value as CarStatus
                                )
                              }
                              className={`${controlClassName} min-w-32`}
                            >
                              {carStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {titleCaseEnum(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Link
                            href={`/cars/${car.slug}`}
                            aria-label={`View ${car.year} ${car.brand} ${car.model} listing`}
                            className={`${iconButtonClassName} text-ink/65 hover:bg-ink/5 hover:text-ink`}
                          >
                            <ExternalLink
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(car)}
                            disabled={isPending}
                            className={`${iconButtonClassName} text-ink/65 hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45`}
                            aria-label={`Edit ${car.year} ${car.brand} ${car.model}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>

                          {isConfirmingDelete ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isPending}
                                className="h-11 rounded-md px-3 text-sm font-bold text-ink/70 outline-none hover:bg-ink/5 focus:ring-2 focus:ring-ink/20"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCar(car)}
                                disabled={isPending}
                                className="h-11 rounded-md bg-red-700 px-3 text-sm font-bold text-white outline-none transition hover:bg-red-800 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
                              >
                                Delete vehicle
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(car.id)}
                              disabled={isPending}
                              className={`${iconButtonClassName} text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45`}
                              aria-label={`Delete ${car.year} ${car.brand} ${car.model}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center bg-white px-5 py-10 text-center">
                  <div>
                    <CarFront
                      className="mx-auto h-8 w-8 text-ink/35"
                      aria-hidden="true"
                    />
                    <h3 className="mt-3 font-black text-ink">
                      No matching vehicles
                    </h3>
                    <p className="mt-1 text-sm text-ink/65">
                      Adjust the search or status filter to see more inventory.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryQuery("");
                        setInventoryStatus("ALL");
                      }}
                      className="mt-4 h-11 rounded-md border border-ink/15 px-4 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section
            id="enquiries-panel"
            role="tabpanel"
            aria-labelledby="enquiries-tab"
            className="p-3 sm:p-4"
          >
            <EnquiryManager
              enquiries={enquiries}
              onChange={setEnquiries}
              statusFilter={enquiryStatus}
              onStatusFilterChange={setEnquiryStatus}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function MetricButton({
  label,
  value,
  icon,
  active,
  onClick
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex min-h-24 items-center gap-3 rounded-md border bg-white p-4 text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-panel focus:ring-2 focus:ring-ink/25 focus:ring-offset-2",
        active ? "border-ink ring-1 ring-ink/10" : "border-ink/10"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md transition",
          active
            ? "bg-ink text-white"
            : "bg-smoke text-ink/65 group-hover:bg-ink group-hover:text-white"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-none text-ink">
          {value}
        </span>
        <span className="mt-1.5 block truncate text-xs font-bold uppercase tracking-[0.1em] text-ink/65">
          {label}
        </span>
      </span>
    </button>
  );
}

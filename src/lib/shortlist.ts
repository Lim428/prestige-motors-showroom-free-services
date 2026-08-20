import type { SerializedCar } from "@/lib/cars";

export const SHORTLIST_LIMIT = 4;
export const SHORTLIST_CHANGED_EVENT = "prestige-shortlist-changed";

const STORAGE_KEY = "prestige-motors-shortlist:v1";

export type ShortlistCar = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  formattedPrice: string;
  imageUrl: string | null;
  imageAlt: string;
  mileage: number;
  transmission: string;
  fuelType: string;
  engine: string;
  condition: string;
  status: string;
  features: string[];
};

type StoredShortlist = {
  version: 1;
  cars: ShortlistCar[];
};

function isShortlistCar(value: unknown): value is ShortlistCar {
  if (!value || typeof value !== "object") {
    return false;
  }

  const car = value as Partial<ShortlistCar>;
  return (
    typeof car.id === "string" &&
    typeof car.slug === "string" &&
    typeof car.brand === "string" &&
    typeof car.model === "string" &&
    typeof car.year === "number" &&
    typeof car.price === "number" &&
    typeof car.formattedPrice === "string" &&
    (car.imageUrl === null || typeof car.imageUrl === "string") &&
    typeof car.imageAlt === "string" &&
    typeof car.mileage === "number" &&
    typeof car.transmission === "string" &&
    typeof car.fuelType === "string" &&
    typeof car.engine === "string" &&
    typeof car.condition === "string" &&
    typeof car.status === "string" &&
    Array.isArray(car.features) &&
    car.features.every((feature) => typeof feature === "string")
  );
}

export function toShortlistCar(car: SerializedCar): ShortlistCar {
  const image = car.images[0];

  return {
    id: car.id,
    slug: car.slug,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    formattedPrice: car.formattedPrice,
    imageUrl: image?.url ?? null,
    imageAlt: image?.altText ?? `${car.year} ${car.brand} ${car.model}`,
    mileage: car.mileage,
    transmission: car.transmission,
    fuelType: car.fuelType,
    engine: car.engine,
    condition: car.condition,
    status: car.status,
    features: car.features
  };
}

export function readShortlist(): ShortlistCar[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const stored = JSON.parse(raw) as Partial<StoredShortlist>;

    if (stored.version !== 1 || !Array.isArray(stored.cars)) {
      return [];
    }

    return stored.cars.filter(isShortlistCar).slice(0, SHORTLIST_LIMIT);
  } catch {
    return [];
  }
}

function persistShortlist(cars: ShortlistCar[]) {
  const shortlist: StoredShortlist = {
    version: 1,
    cars: cars.slice(0, SHORTLIST_LIMIT)
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shortlist));
  window.dispatchEvent(new CustomEvent(SHORTLIST_CHANGED_EVENT));
}

export function saveToShortlist(car: ShortlistCar) {
  if (typeof window === "undefined") {
    return { cars: [] as ShortlistCar[], added: false, reason: "unavailable" as const };
  }

  const current = readShortlist();

  if (current.some((item) => item.id === car.id)) {
    return { cars: current, added: false, reason: "duplicate" as const };
  }

  if (current.length >= SHORTLIST_LIMIT) {
    return { cars: current, added: false, reason: "limit" as const };
  }

  const cars = [...current, car];
  persistShortlist(cars);
  return { cars, added: true, reason: null };
}

export function removeFromShortlist(carId: string) {
  if (typeof window === "undefined") {
    return [] as ShortlistCar[];
  }

  const cars = readShortlist().filter((car) => car.id !== carId);
  persistShortlist(cars);
  return cars;
}

export function replaceShortlist(cars: ShortlistCar[]) {
  if (typeof window === "undefined") {
    return;
  }

  const uniqueCars = Array.from(new Map(cars.map((car) => [car.id, car])).values());
  persistShortlist(uniqueCars);
}

export function subscribeToShortlist(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(SHORTLIST_CHANGED_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SHORTLIST_CHANGED_EVENT, onChange);
  };
}

import type { SerializedCar } from "@/lib/cars";
import type { CarQuery } from "@/lib/validators";

const timestamp = "2026-08-20T08:00:00.000Z";

function previewCar(
  car: Omit<
    SerializedCar,
    | "createdAt"
    | "updatedAt"
    | "isPublished"
    | "formattedPrice"
    | "images"
  > & {
    imageUrl: string;
    imageAlt: string;
  }
): SerializedCar {
  const { imageUrl, imageAlt, ...details } = car;

  return {
    ...details,
    createdAt: timestamp,
    updatedAt: timestamp,
    isPublished: true,
    formattedPrice: new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      maximumFractionDigits: 0
    }).format(details.price),
    images: [
      {
        id: `${details.id}-image-1`,
        carId: details.id,
        url: imageUrl,
        publicId: null,
        altText: imageAlt,
        width: 1600,
        height: 1067,
        sortOrder: 0,
        createdAt: timestamp
      }
    ]
  };
}

export const previewCars: SerializedCar[] = [
  previewCar({
    id: "10000000-0000-4000-8000-000000000001",
    slug: "2021-toyota-camry-2-5v",
    stockCode: "PM-26081",
    brand: "Toyota",
    model: "Camry",
    variant: "2.5V",
    year: 2021,
    registrationYear: 2021,
    mileage: 38250,
    bodyType: "Sedan",
    exteriorColor: "Graphite Metallic",
    interiorColor: "Black",
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "2.5L Dynamic Force",
    engineCc: 2487,
    seats: 5,
    doors: 4,
    drivetrain: "Front-wheel drive",
    assemblyType: "CKD",
    showroomLocation: "Petaling Jaya",
    price: 128800,
    condition: "Dealer inspected",
    description:
      "A carefully kept Toyota Camry with clear service records, clean cabin trim and a smooth naturally aspirated drivetrain. The car has been checked by the showroom team and is ready for an in-person inspection and test drive.",
    features: [
      "Toyota Safety Sense",
      "Adaptive LED headlights",
      "360-degree camera",
      "JBL premium audio",
      "Adaptive cruise control",
      "Wireless Apple CarPlay"
    ],
    status: "AVAILABLE",
    imageUrl: "/images/preview-toyota.jpg",
    imageAlt: "Dark grey Toyota Camry photographed at night"
  }),
  previewCar({
    id: "10000000-0000-4000-8000-000000000002",
    slug: "2020-audi-rs6-avant",
    stockCode: "PM-26073",
    brand: "Audi",
    model: "RS6",
    variant: "Avant",
    year: 2020,
    registrationYear: 2020,
    mileage: 61400,
    bodyType: "Wagon",
    exteriorColor: "Mythos Black",
    interiorColor: "Black",
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "4.0L TFSI Twin-Turbo V8",
    engineCc: 3996,
    seats: 5,
    doors: 5,
    drivetrain: "Quattro all-wheel drive",
    assemblyType: "CBU",
    showroomLocation: "Petaling Jaya",
    price: 548800,
    condition: "Dealer inspected",
    description:
      "A well-presented Audi RS6 Avant with documented maintenance, tidy original interior surfaces and a formidable twin-turbo V8. Its premium equipment and all-weather performance make it an exceptional high-performance estate.",
    features: [
      "Quattro all-wheel drive",
      "Matrix LED headlights",
      "Four-zone climate control",
      "Bang & Olufsen audio",
      "360-degree camera",
      "Adaptive cruise control"
    ],
    status: "AVAILABLE",
    imageUrl: "/images/preview-honda.jpg",
    imageAlt: "Black Audi RS6 photographed from the front"
  }),
  previewCar({
    id: "10000000-0000-4000-8000-000000000003",
    slug: "2019-mercedes-benz-amg-gt-s",
    stockCode: "PM-26064",
    brand: "Mercedes-Benz",
    model: "AMG GT",
    variant: "S",
    year: 2019,
    registrationYear: 2019,
    mileage: 32100,
    bodyType: "Coupe",
    exteriorColor: "Obsidian Black",
    interiorColor: "Black Artico",
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "4.0L AMG Biturbo V8",
    engineCc: 3982,
    seats: 2,
    doors: 2,
    drivetrain: "Rear-wheel drive",
    assemblyType: "CBU",
    showroomLocation: "Petaling Jaya",
    price: 688800,
    condition: "Dealer inspected",
    description:
      "A dramatic Mercedes-AMG GT S with a clean ownership profile, comprehensive service records and an elegant black cabin. The hand-built biturbo V8 remains smooth in town and deeply capable on the open road.",
    features: [
      "AMG Ride Control",
      "AMG performance seats",
      "Burmester surround sound",
      "Keyless start",
      "AMG Dynamic Select",
      "Active parking assist"
    ],
    status: "RESERVED",
    imageUrl: "/images/preview-mercedes.jpg",
    imageAlt: "Black Mercedes-AMG GT photographed beside a marina"
  })
];

export function filterPreviewCars(query: CarQuery) {
  const search = query.search?.toLocaleLowerCase("en-MY");
  const filtered = previewCars.filter((car) => {
    const searchable = [
      car.stockCode,
      car.brand,
      car.model,
      car.variant,
      car.bodyType,
      car.engine,
      car.showroomLocation
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("en-MY");

    return (
      (!search || searchable.includes(search)) &&
      (!query.brand || car.brand.toLocaleLowerCase("en-MY") === query.brand.toLocaleLowerCase("en-MY")) &&
      (!query.bodyType || car.bodyType?.toLocaleLowerCase("en-MY") === query.bodyType.toLocaleLowerCase("en-MY")) &&
      (!query.fuel || car.fuelType === query.fuel) &&
      (!query.transmission || car.transmission === query.transmission) &&
      (query.minPrice === undefined || car.price >= query.minPrice) &&
      (query.maxPrice === undefined || car.price <= query.maxPrice) &&
      (query.minYear === undefined || car.year >= query.minYear) &&
      (query.maxYear === undefined || car.year <= query.maxYear) &&
      (query.maxMileage === undefined || car.mileage <= query.maxMileage)
    );
  });

  return [...filtered].sort((left, right) => {
    switch (query.sort) {
      case "price-asc":
        return left.price - right.price;
      case "price-desc":
        return right.price - left.price;
      case "year-asc":
        return left.year - right.year;
      case "year-desc":
        return right.year - left.year;
      default:
        return right.createdAt.localeCompare(left.createdAt);
    }
  });
}

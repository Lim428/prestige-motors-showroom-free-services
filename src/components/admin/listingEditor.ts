import { vehicleModelLabel } from "@/lib/car-display";

export type DescriptionLanguage = "en" | "ms";

export type ListingEditorFacts = {
  brand: string;
  model: string;
  variant: string;
  year: string;
  registrationYear: string;
  mileage: string;
  transmission: string;
  fuelType: string;
  engine: string;
  engineCc: string;
  price: string;
  condition: string;
  stockCode: string;
  bodyType: string;
  exteriorColor: string;
  interiorColor: string;
  seats: string;
  doors: string;
  drivetrain: string;
  assemblyType: string;
  showroomLocation: string;
  features: string;
  description: string;
};

export type ListingReadiness = {
  score: number;
  label: "Ready to publish" | "Strong foundation" | "Needs attention";
  canPublish: boolean;
  blockers: string[];
  sections: Array<{
    label: string;
    score: number;
    maximum: number;
  }>;
  warnings: string[];
};

const fuelLabels: Record<string, { en: string; ms: string }> = {
  PETROL: { en: "petrol", ms: "petrol" },
  DIESEL: { en: "diesel", ms: "diesel" },
  HYBRID: { en: "hybrid", ms: "hibrid" },
  ELECTRIC: { en: "electric", ms: "elektrik" }
};

const transmissionLabels: Record<string, { en: string; ms: string }> = {
  AUTOMATIC: { en: "automatic", ms: "automatik" },
  MANUAL: { en: "manual", ms: "manual" }
};

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hasValue(value: string) {
  return clean(value).length > 0;
}

function numericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function featureLines(features: string) {
  return features
    .split("\n")
    .map(clean)
    .filter(Boolean);
}

export function nullableText(value: string) {
  const normalized = clean(value);
  return normalized || null;
}

export function nullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getVehicleName(facts: Pick<ListingEditorFacts, "year" | "brand" | "model" | "variant">) {
  const model = clean(facts.model);
  const modelWithVariant = vehicleModelLabel(model, clean(facts.variant));
  const identity = [facts.brand, modelWithVariant].map(clean).filter(Boolean);

  if (identity.length === 0) {
    return "";
  }

  return [clean(facts.year), ...identity].filter(Boolean).join(" ");
}

function formatNumber(value: string) {
  if (!value.trim()) {
    return "";
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? new Intl.NumberFormat("en-MY").format(number)
    : "";
}

function formatYear(value: string) {
  const year = numericValue(value);
  return year === null
    ? ""
    : new Intl.NumberFormat("en-MY", { useGrouping: false }).format(year);
}

function englishDescription(facts: ListingEditorFacts) {
  const vehicleName = getVehicleName(facts) || "This vehicle";
  const sentences: string[] = [`${vehicleName} is listed for sale.`];
  const mileage = formatNumber(facts.mileage);
  const engineCapacity = formatNumber(facts.engineCc);
  const seats = formatNumber(facts.seats);
  const doors = formatNumber(facts.doors);

  if (mileage) {
    sentences.push(`The recorded mileage is ${mileage} km.`);
  }

  if (hasValue(facts.condition)) {
    sentences.push(`The listed condition is ${clean(facts.condition)}.`);
  }

  const powertrainParts = [
    hasValue(facts.engine) ? clean(facts.engine) : "",
    engineCapacity ? `${engineCapacity} cc` : "",
    fuelLabels[facts.fuelType]?.en ?? clean(facts.fuelType).toLowerCase(),
    transmissionLabels[facts.transmission]?.en
      ? `${transmissionLabels[facts.transmission].en} transmission`
      : ""
  ].filter(Boolean);

  if (powertrainParts.length > 0) {
    sentences.push(`Recorded powertrain: ${powertrainParts.join(", ")}.`);
  }

  const specificationParts = [
    hasValue(facts.bodyType) ? clean(facts.bodyType) : "",
    hasValue(facts.drivetrain) ? clean(facts.drivetrain) : "",
    seats ? `${seats} seats` : "",
    doors ? `${doors} doors` : "",
    hasValue(facts.assemblyType) ? clean(facts.assemblyType) : ""
  ].filter(Boolean);

  if (specificationParts.length > 0) {
    sentences.push(`Vehicle details: ${specificationParts.join(", ")}.`);
  }

  const finishParts = [
    hasValue(facts.exteriorColor)
      ? `${clean(facts.exteriorColor)} exterior`
      : "",
    hasValue(facts.interiorColor)
      ? `${clean(facts.interiorColor)} interior`
      : ""
  ].filter(Boolean);

  if (finishParts.length > 0) {
    sentences.push(`Finish: ${finishParts.join(" with ")}.`);
  }

  const registrationYear = formatYear(facts.registrationYear);
  if (registrationYear) {
    sentences.push(`Registration year: ${registrationYear}.`);
  }

  const price = formatNumber(facts.price);
  if (price) {
    sentences.push(`Advertised price: RM ${price}.`);
  }

  if (hasValue(facts.stockCode)) {
    sentences.push(`Stock code: ${clean(facts.stockCode)}.`);
  }

  if (hasValue(facts.showroomLocation)) {
    sentences.push(`Available for viewing at ${clean(facts.showroomLocation)}.`);
  }

  const equipment = featureLines(facts.features);
  if (equipment.length > 0) {
    sentences.push(`Recorded equipment: ${equipment.join(", ")}.`);
  }

  return sentences.join("\n\n");
}

function malayDescription(facts: ListingEditorFacts) {
  const vehicleName = getVehicleName(facts) || "Kenderaan ini";
  const sentences: string[] = [`${vehicleName} disenaraikan untuk dijual.`];
  const mileage = formatNumber(facts.mileage);
  const engineCapacity = formatNumber(facts.engineCc);
  const seats = formatNumber(facts.seats);
  const doors = formatNumber(facts.doors);

  if (mileage) {
    sentences.push(`Perbatuan yang direkodkan ialah ${mileage} km.`);
  }

  if (hasValue(facts.condition)) {
    sentences.push(`Keadaan yang disenaraikan ialah ${clean(facts.condition)}.`);
  }

  const powertrainParts = [
    hasValue(facts.engine) ? clean(facts.engine) : "",
    engineCapacity ? `${engineCapacity} cc` : "",
    fuelLabels[facts.fuelType]?.ms ?? clean(facts.fuelType).toLowerCase(),
    transmissionLabels[facts.transmission]?.ms
      ? `transmisi ${transmissionLabels[facts.transmission].ms}`
      : ""
  ].filter(Boolean);

  if (powertrainParts.length > 0) {
    sentences.push(`Butiran rangkaian kuasa: ${powertrainParts.join(", ")}.`);
  }

  const specificationParts = [
    hasValue(facts.bodyType) ? clean(facts.bodyType) : "",
    hasValue(facts.drivetrain) ? clean(facts.drivetrain) : "",
    seats ? `${seats} tempat duduk` : "",
    doors ? `${doors} pintu` : "",
    hasValue(facts.assemblyType) ? clean(facts.assemblyType) : ""
  ].filter(Boolean);

  if (specificationParts.length > 0) {
    sentences.push(`Butiran kenderaan: ${specificationParts.join(", ")}.`);
  }

  const finishParts = [
    hasValue(facts.exteriorColor)
      ? `luaran ${clean(facts.exteriorColor)}`
      : "",
    hasValue(facts.interiorColor)
      ? `dalaman ${clean(facts.interiorColor)}`
      : ""
  ].filter(Boolean);

  if (finishParts.length > 0) {
    sentences.push(`Kemasan: ${finishParts.join(" dengan ")}.`);
  }

  const registrationYear = formatYear(facts.registrationYear);
  if (registrationYear) {
    sentences.push(`Tahun pendaftaran: ${registrationYear}.`);
  }

  const price = formatNumber(facts.price);
  if (price) {
    sentences.push(`Harga iklan: RM ${price}.`);
  }

  if (hasValue(facts.stockCode)) {
    sentences.push(`Kod stok: ${clean(facts.stockCode)}.`);
  }

  if (hasValue(facts.showroomLocation)) {
    sentences.push(`Boleh dilihat di ${clean(facts.showroomLocation)}.`);
  }

  const equipment = featureLines(facts.features);
  if (equipment.length > 0) {
    sentences.push(`Kelengkapan yang direkodkan: ${equipment.join(", ")}.`);
  }

  return sentences.join("\n\n");
}

/**
 * Builds copy solely from fields entered by the dealer. Deliberately does not
 * generate ownership, accident, service-history, warranty, or certification claims.
 */
export function buildDescriptionTemplate(
  language: DescriptionLanguage,
  facts: ListingEditorFacts
) {
  return language === "ms"
    ? malayDescription(facts)
    : englishDescription(facts);
}

export function assessListingReadiness(
  facts: ListingEditorFacts,
  images: Array<{ altText: string }>
): ListingReadiness {
  const descriptionLength = clean(facts.description).length;
  const features = featureLines(facts.features);
  const altTextComplete =
    images.length > 0 && images.every((image) => clean(image.altText).length >= 2);
  const structuredChecks = [
    hasValue(facts.brand),
    hasValue(facts.model),
    numericValue(facts.year) !== null,
    numericValue(facts.price) !== null,
    numericValue(facts.mileage) !== null || facts.mileage.trim() === "0",
    hasValue(facts.transmission),
    hasValue(facts.fuelType),
    hasValue(facts.engine),
    hasValue(facts.condition),
    hasValue(facts.stockCode),
    hasValue(facts.variant),
    numericValue(facts.registrationYear) !== null,
    hasValue(facts.bodyType),
    hasValue(facts.exteriorColor),
    facts.fuelType === "ELECTRIC" || numericValue(facts.engineCc) !== null,
    hasValue(facts.drivetrain),
    hasValue(facts.assemblyType),
    hasValue(facts.showroomLocation),
    numericValue(facts.seats) !== null,
    numericValue(facts.doors) !== null
  ];
  const structuredScore = Math.round(
    (structuredChecks.filter(Boolean).length / structuredChecks.length) * 50
  );

  const copyScore =
    (descriptionLength >= 80 ? 10 : 0) +
    (descriptionLength >= 180 ? 7 : 0) +
    (features.length >= 3 ? 4 : 0) +
    (features.length >= 6 ? 4 : 0);

  const photoScore =
    (images.length >= 1 ? 6 : 0) +
    (images.length >= 6 ? 6 : 0) +
    (images.length >= 12 ? 6 : 0) +
    (altTextComplete ? 7 : 0);

  const score = structuredScore + copyScore + photoScore;
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!hasValue(facts.brand)) blockers.push("Add the vehicle brand.");
  if (!hasValue(facts.model)) blockers.push("Add the vehicle model.");
  if (!numericValue(facts.year)) blockers.push("Add a valid manufacturing year.");
  if (!hasValue(facts.stockCode)) blockers.push("Add the dealer stock code.");
  if (!hasValue(facts.variant)) blockers.push("Add the exact model variant or grade.");
  if (!numericValue(facts.registrationYear)) blockers.push("Add the JPJ registration year.");
  if (!hasValue(facts.bodyType)) blockers.push("Add the body type.");
  if (
    numericValue(facts.mileage) === null &&
    facts.mileage.trim() !== "0"
  ) {
    blockers.push("Add the recorded mileage.");
  }
  if (!hasValue(facts.transmission)) blockers.push("Add the transmission.");
  if (!hasValue(facts.fuelType)) blockers.push("Add the fuel type.");
  if (!hasValue(facts.engine)) blockers.push("Add the engine description.");
  if (facts.fuelType !== "ELECTRIC" && !numericValue(facts.engineCc)) {
    blockers.push("Add the engine capacity in cc.");
  }
  if (!hasValue(facts.exteriorColor)) blockers.push("Add the exterior colour.");
  if (!numericValue(facts.price)) blockers.push("Add a valid advertised price.");
  if (!hasValue(facts.condition)) blockers.push("Add the vehicle condition.");
  if (!hasValue(facts.showroomLocation)) blockers.push("Add the viewing location.");
  if (descriptionLength < 80) {
    blockers.push("Write at least 80 factual characters of description.");
  }
  if (features.length < 3) blockers.push("Add at least 3 verified features.");
  if (images.length < 6) {
    blockers.push(`Add at least 6 genuine photos (${images.length} added).`);
  }
  if (images.length > 0 && !altTextComplete) {
    blockers.push("Complete the alternative text for every photo.");
  }

  if (!hasValue(facts.interiorColor)) warnings.push("Add the interior colour if verified.");
  if (!hasValue(facts.drivetrain)) warnings.push("Add the drivetrain if verified.");
  if (!hasValue(facts.assemblyType)) warnings.push("Add the assembly or import type if verified.");
  if (!numericValue(facts.seats)) warnings.push("Add the seating capacity if verified.");
  if (!numericValue(facts.doors)) warnings.push("Add the door count if verified.");
  if (descriptionLength < 180) warnings.push("Expand the description to at least 180 characters.");
  if (features.length < 6) warnings.push("List at least 6 verified features.");
  if (images.length < 12) warnings.push(`Add ${12 - images.length} more photos for a complete gallery.`);
  const canPublish = blockers.length === 0;

  return {
    score,
    label:
      canPublish
        ? "Ready to publish"
        : score >= 65
          ? "Strong foundation"
          : "Needs attention",
    canPublish,
    blockers,
    sections: [
      { label: "Vehicle data", score: structuredScore, maximum: 50 },
      { label: "Listing copy", score: copyScore, maximum: 25 },
      { label: "Photo gallery", score: photoScore, maximum: 25 }
    ],
    warnings
  };
}

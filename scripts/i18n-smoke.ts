import { buildFallbackReply } from "../src/lib/assistant";
import { instantTranslations } from "../src/i18n/instant-translations";
import { sourceCatalog } from "../src/i18n/source-catalog.generated";

const source = new Set<string>(sourceCatalog);
const instantCounts: Record<"ms" | "zh", number> = { ms: 0, zh: 0 };

for (const locale of ["ms", "zh"] as const) {
  const table = instantTranslations[locale];

  if (!table) {
    throw new Error(`${locale} instant translation table is missing.`);
  }

  instantCounts[locale] = Object.keys(table).length;
  const missing = Object.keys(table).filter((key) => !source.has(key));

  if (missing.length > 0) {
    throw new Error(`${locale} instant translations missing from source catalogue: ${missing.join(" | ")}`);
  }

  for (const [original, translation] of Object.entries(table)) {
    if (placeholderCount(original) !== placeholderCount(translation)) {
      throw new Error(`${locale} placeholder mismatch: ${original} -> ${translation}`);
    }
  }
}

const car = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "toyota-camry-25v",
  stockCode: "PM001",
  brand: "Toyota",
  model: "Camry",
  variant: "2.5V",
  year: 2022,
  registrationYear: 2022,
  mileage: 28_000,
  bodyType: "Sedan",
  exteriorColor: "Black",
  interiorColor: "Black",
  transmission: "AUTOMATIC",
  fuelType: "PETROL",
  engine: "2.5L",
  engineCc: 2494,
  seats: 5,
  doors: 4,
  drivetrain: "FWD",
  assemblyType: "LOCAL",
  showroomLocation: "Kuala Lumpur",
  price: 98_000,
  condition: "Used",
  status: "AVAILABLE" as const,
  description: "A well-presented executive sedan.",
  features: ["Leather seats", "Reverse camera", "Adaptive cruise control"]
};

const replies = {
  en: buildFallbackReply("hello", [car], "en"),
  ms: buildFallbackReply("kereta paling murah", [car], "ms"),
  zh: buildFallbackReply("推荐家庭轿车", [car], "zh")
};

if (!replies.en.startsWith("Hello")) {
  throw new Error("English assistant fallback did not use English copy.");
}

if (!replies.ms.includes("Padanan semasa")) {
  throw new Error("Malay assistant fallback did not return a localized recommendation.");
}

if (!replies.zh.includes("目前最合适")) {
  throw new Error("Chinese assistant fallback did not return a localized recommendation.");
}

console.log(
  `i18n smoke passed: ${sourceCatalog.length} source phrases, ${instantCounts.ms} Malay instant translations, ${instantCounts.zh} Chinese instant translations.`
);

function placeholderCount(value: string) {
  return value.match(/\{value\}/g)?.length ?? 0;
}

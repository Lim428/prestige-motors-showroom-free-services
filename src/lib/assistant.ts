import type { CarStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMileage, formatPrice, titleCaseEnum } from "@/lib/format";
import { dealerPhone, dealerWhatsApp, siteUrl } from "@/lib/utils";
import type { AssistantRequest } from "@/lib/validators";

type AssistantCar = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  transmission: string;
  fuelType: string;
  engine: string;
  price: number;
  condition: string;
  status: CarStatus;
  description: string;
  features: string[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

export async function getAssistantCars() {
  const cars = await prisma.car.findMany({
    where: {
      status: {
        not: "SOLD"
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 18,
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      year: true,
      mileage: true,
      transmission: true,
      fuelType: true,
      engine: true,
      price: true,
      condition: true,
      status: true,
      description: true,
      features: true
    }
  });

  return cars.map((car) => ({
    ...car,
    price: Number(car.price)
  }));
}

export function buildFallbackReply(message: string, cars: AssistantCar[]) {
  if (cars.length === 0) {
    return "I do not see available vehicles in the showroom right now. Please contact the dealer and the team can confirm fresh stock.";
  }

  const budget = extractBudget(message);
  const lowerMessage = message.toLowerCase();
  const availableCars = cars.filter((car) => car.status === "AVAILABLE");
  let matches = availableCars;

  if (budget) {
    matches = matches.filter((car) => car.price <= budget);
  }

  for (const fuel of ["petrol", "diesel", "hybrid", "electric"]) {
    if (lowerMessage.includes(fuel)) {
      matches = matches.filter((car) => car.fuelType.toLowerCase() === fuel);
    }
  }

  for (const transmission of ["auto", "automatic", "manual"]) {
    if (lowerMessage.includes(transmission)) {
      const normalized = transmission === "manual" ? "manual" : "automatic";
      matches = matches.filter((car) => car.transmission.toLowerCase() === normalized);
    }
  }

  const shortlist = (matches.length ? matches : availableCars).slice(0, 3);

  if (shortlist.length === 0) {
    return `Most matching cars are currently reserved or sold. You can still ask the dealer on WhatsApp: https://wa.me/${dealerWhatsApp()}`;
  }

  const carLines = shortlist
    .map(
      (car) =>
        `${car.year} ${car.brand} ${car.model} (${formatPrice(car.price)}, ${formatMileage(
          car.mileage
        )}, ${titleCaseEnum(car.fuelType)})`
    )
    .join("; ");

  return `Here are good matches from the current showroom: ${carLines}. Open the vehicle page for photos and details, or WhatsApp the dealer at https://wa.me/${dealerWhatsApp()}.`;
}

export async function askGemini(input: AssistantRequest, cars: AssistantCar[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt(cars) }]
      },
      contents: buildContents(input),
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        maxOutputTokens: 420
      }
    })
  });

  const result = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(result.error?.message ?? "Gemini request failed.");
  }

  const reply = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  return reply || null;
}

function buildContents(input: AssistantRequest) {
  const history = input.history.slice(-6).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));

  return [
    ...history,
    {
      role: "user",
      parts: [{ text: input.message }]
    }
  ];
}

function buildSystemPrompt(cars: AssistantCar[]) {
  const inventory = cars
    .map(
      (car) =>
        [
          `${car.year} ${car.brand} ${car.model}`,
          `status: ${titleCaseEnum(car.status)}`,
          `price: ${formatPrice(car.price)}`,
          `mileage: ${formatMileage(car.mileage)}`,
          `fuel: ${titleCaseEnum(car.fuelType)}`,
          `transmission: ${titleCaseEnum(car.transmission)}`,
          `engine: ${car.engine}`,
          `condition: ${car.condition}`,
          `features: ${car.features.slice(0, 8).join(", ")}`,
          `url: ${siteUrl()}/cars/${car.slug}`
        ].join(" | ")
    )
    .join("\n");

  return `You are the online buyer assistant for Prestige Motors, a premium used car dealership.
Use only the supplied inventory. Do not invent vehicles, prices, discounts, warranties, finance approvals, or stock status.
All prices must be shown in RM. Keep replies concise, helpful, and friendly, usually under 120 words.
Recommend up to 3 vehicles at a time and include the vehicle page URL when useful.
Encourage the buyer to contact the dealer for viewing, booking, trade-in, financing, or final availability.
Do not ask for sensitive identity or banking details.
Dealer phone: ${dealerPhone()}
Dealer WhatsApp: https://wa.me/${dealerWhatsApp()}

Current inventory:
${inventory || "No available or reserved vehicles are currently listed."}`;
}

function extractBudget(message: string) {
  const normalized = message.toLowerCase().replace(/,/g, "");
  const rmMatch = normalized.match(/(?:rm|under|below|budget|less than)\s*(\d{4,7})/);
  const kMatch = normalized.match(/(\d{1,3})\s*k/);

  if (rmMatch?.[1]) {
    return Number(rmMatch[1]);
  }

  if (kMatch?.[1]) {
    return Number(kMatch[1]) * 1000;
  }

  return null;
}

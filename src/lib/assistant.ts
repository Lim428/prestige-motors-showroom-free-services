import type { CarStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMileage, formatPrice, titleCaseEnum } from "@/lib/format";
import {
  dealerAddress,
  dealerEmail,
  dealerHours,
  dealerPhone,
  dealerWhatsApp,
  siteUrl
} from "@/lib/utils";
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
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GEMINI_TIMEOUT_MS = 15_000;

export type AssistantModeReason = "not_configured" | "provider_error";

export async function getAssistantCars() {
  const cars = await prisma.car.findMany({
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
    return `I do not see any current listings right now. ${dealerContactSentence()}`;
  }

  const lowerMessage = message.toLowerCase().replace(/[’']/g, "'");
  const availableCars = cars.filter((car) => car.status === "AVAILABLE");

  if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening))[!.?\s]*$/i.test(message.trim())) {
    return "Hello! Tell me your budget, preferred fuel type, or how you will use the car, and I’ll compare the current listings for you.";
  }

  if (
    /\b(opening hours?|business hours?|what time|when (?:are|do) you open|when (?:are|do) you close|weekends?|open today)\b/.test(
      lowerMessage
    )
  ) {
    const hours = dealerHours();

    return hours
      ? `Our published showroom hours are ${hours}. Please confirm before travelling. ${dealerContactSentence()}`
      : `The showroom hours have not been published in my current information. ${dealerContactSentence()}`;
  }

  if (/\b(address|location|located|where (?:are|is) (?:you|the showroom))\b/.test(lowerMessage)) {
    const address = dealerAddress();

    return address
      ? `The showroom is at ${address}. ${dealerContactSentence()}`
      : `The showroom address has not been published in my current information. ${dealerContactSentence()}`;
  }

  if (/\b(contact|phone|call|whatsapp|email|reach you)\b/.test(lowerMessage)) {
    return dealerContactSentence();
  }

  if (/\b(financ(?:e|ing)|loan|instal+ments?|monthly payment|deposit|down payment)\b/.test(lowerMessage)) {
    return `Financing and monthly payments depend on the vehicle, deposit, lender, and buyer eligibility, so I can’t promise an approval or exact instalment here. ${dealerContactSentence()}`;
  }

  if (/\b(trade[ -]?in|trade my|part exchange|sell my car)\b/.test(lowerMessage)) {
    return `The showroom can assess a trade-in after checking the vehicle’s condition, mileage, and ownership details. ${dealerContactSentence()}`;
  }

  if (/\b(test drive|viewing|book|reserve|appointment)\b/.test(lowerMessage)) {
    return `You can request a viewing or test drive for an available vehicle, but the showroom must confirm the time and final availability. ${dealerContactSentence()}`;
  }

  if (/\b(warrant(?:y|ies)|guarantee|return policy)\b/.test(lowerMessage)) {
    return `Warranty coverage is not confirmed in the listing data and may differ by vehicle. Please ask the showroom for the written coverage before deciding. ${dealerContactSentence()}`;
  }

  const namedCars = findNamedCars(lowerMessage, cars);

  if (/\b(available|availability|in stock|reserved|sold)\b/.test(lowerMessage)) {
    if (namedCars.length > 0) {
      return namedCars
        .slice(0, 3)
        .map(
          (car) =>
            `${car.year} ${car.brand} ${car.model} is ${titleCaseEnum(car.status).toLowerCase()}. ${siteUrl()}/cars/${car.slug}`
        )
        .join("\n");
    }

    if (availableCars.length === 0) {
      return `No vehicle is marked available right now. ${dealerContactSentence()}`;
    }

    return `${availableCars.length} vehicle${availableCars.length === 1 ? " is" : "s are"} marked available now:\n${formatCarList(
      availableCars.slice(0, 3)
    )}`;
  }

  if (availableCars.length === 0) {
    const reservedCars = cars.filter((car) => car.status === "RESERVED").slice(0, 3);
    const reservedDetail =
      reservedCars.length > 0 ? ` Current reserved vehicles:\n${formatCarList(reservedCars)}` : "";

    return `No vehicle is marked available right now.${reservedDetail}\n${dealerContactSentence()}`;
  }

  const budget = extractBudget(message);
  const requestedFuel = ["petrol", "diesel", "hybrid", "electric"].find((fuel) =>
    lowerMessage.includes(fuel)
  );
  const requestedTransmission = /\bmanual\b/.test(lowerMessage)
    ? "manual"
    : /\b(?:auto|automatic)\b/.test(lowerMessage)
      ? "automatic"
      : null;
  const wantsSuv = /\b(?:suv|crossover|4x4)\b/.test(lowerMessage);
  const wantsSedan = /\b(?:sedan|saloon)\b/.test(lowerMessage);
  const wantsFamily = /\b(?:family|children|kids|child|practical|spacious)\b/.test(lowerMessage);
  const wantsDailyDriver = /\b(?:daily|commut(?:e|er|ing)|city driving|work car)\b/.test(
    lowerMessage
  );
  const wantsEconomy = /\b(?:economical|economy|fuel efficient|save fuel|low running cost)\b/.test(
    lowerMessage
  );
  const wantsLuxury = /\b(?:luxury|premium|comfortable|comfort|refined|quiet)\b/.test(
    lowerMessage
  );
  const wantsPerformance = /\b(?:fast|performance|sporty|powerful|acceleration)\b/.test(
    lowerMessage
  );
  const wantsSafety = /\b(?:safe|safety|driver assistance)\b/.test(lowerMessage);
  const wantsCheapest = /\b(?:cheapest|lowest price|affordable|cheap|budget friendly)\b/.test(
    lowerMessage
  );
  const wantsNewest = /\b(?:newest|latest|most recent)\b/.test(lowerMessage);
  const wantsLowMileage = /\b(?:lowest mileage|low mileage|least mileage)\b/.test(lowerMessage);
  const seatMatch = lowerMessage.match(/\b([2-9])[\s-]*(?:seat|seater|seats)\b/);
  const requestedSeats = seatMatch?.[1] ? Number(seatMatch[1]) : null;

  let matches = availableCars;
  const constraints: string[] = [];

  if (namedCars.length > 0) {
    const namedIds = new Set(namedCars.map((car) => car.id));
    matches = matches.filter((car) => namedIds.has(car.id));
    constraints.push("that model");
  }

  if (budget) {
    matches = matches.filter((car) => car.price <= budget);
    constraints.push(`a budget of ${formatPrice(budget)}`);
  }

  if (requestedFuel) {
    matches = matches.filter((car) => car.fuelType.toLowerCase() === requestedFuel);
    constraints.push(requestedFuel);
  }

  if (requestedTransmission) {
    matches = matches.filter(
      (car) => car.transmission.toLowerCase() === requestedTransmission
    );
    constraints.push(requestedTransmission);
  }

  if (wantsSuv) {
    matches = matches.filter((car) => carSearchText(car).includes("suv"));
    constraints.push("an SUV");
  }

  if (wantsSedan) {
    matches = matches.filter((car) => carSearchText(car).includes("sedan"));
    constraints.push("a sedan");
  }

  if (requestedSeats) {
    matches = matches.filter((car) =>
      new RegExp(`\\b${requestedSeats}[\\s-]*(?:seat|seater|seats)\\b`).test(carSearchText(car))
    );
    constraints.push(`${requestedSeats} seats`);
  }

  if (matches.length === 0) {
    const exactNonAvailable = namedCars.find((car) => car.status !== "AVAILABLE");

    if (exactNonAvailable) {
      return `The ${exactNonAvailable.year} ${exactNonAvailable.brand} ${exactNonAvailable.model} is currently ${titleCaseEnum(
        exactNonAvailable.status
      ).toLowerCase()}, so I can’t present it as available. ${dealerContactSentence()}`;
    }

    if (requestedSeats) {
      return `No current listing confirms a ${requestedSeats}-seat layout. ${dealerContactSentence()}`;
    }

    const closest = [...availableCars]
      .sort((a, b) => {
        if (budget) {
          return Math.abs(a.price - budget) - Math.abs(b.price - budget);
        }

        return a.price - b.price;
      })
      .slice(0, 2);

    return `I couldn’t find an available listing that confirms ${constraints.join(
      ", "
    )}. Closest current options are:\n${formatCarList(closest)}\n${dealerContactSentence()}`;
  }

  const hasBuyingIntent =
    namedCars.length > 0 ||
    Boolean(budget || requestedFuel || requestedTransmission || wantsSuv || wantsSedan) ||
    Boolean(
      wantsFamily ||
        wantsDailyDriver ||
        wantsEconomy ||
        wantsLuxury ||
        wantsPerformance ||
        wantsSafety ||
        wantsCheapest ||
        wantsNewest ||
        wantsLowMileage ||
        requestedSeats
    ) ||
    /\b(?:car|vehicle|recommend|option|choose|best|compare|looking for|show me|do you have)\b/.test(
      lowerMessage
    );

  if (!hasBuyingIntent) {
    return `I can help with current vehicles, prices, availability, features, budgets, fuel types, trade-ins, financing, and viewings. What would you like to know?`;
  }

  const ranked = [...matches].sort((a, b) => {
    if (wantsCheapest) {
      return a.price - b.price;
    }

    if (wantsNewest) {
      return b.year - a.year || a.mileage - b.mileage;
    }

    if (wantsLowMileage) {
      return a.mileage - b.mileage;
    }

    return (
      scoreCar(b, {
        wantsFamily,
        wantsDailyDriver,
        wantsEconomy,
        wantsLuxury,
        wantsPerformance,
        wantsSafety
      }) -
      scoreCar(a, {
        wantsFamily,
        wantsDailyDriver,
        wantsEconomy,
        wantsLuxury,
        wantsPerformance,
        wantsSafety
      })
    );
  });

  const resultLimit = wantsCheapest || wantsNewest || wantsLowMileage ? 1 : 3;
  const shortlist = ranked.slice(0, resultLimit);
  const qualifier = constraints.length > 0 ? ` for ${constraints.join(", ")}` : "";
  const detail =
    namedCars.length === 1
      ? `\nEngine: ${shortlist[0].engine}. Highlights: ${shortlist[0].features
          .slice(0, 4)
          .join(", ")}.`
      : "";

  return `The strongest current match${shortlist.length === 1 ? "" : "es"}${qualifier}:\n${formatCarList(
    shortlist
  )}${detail}`;
}

export async function askGemini(input: AssistantRequest, cars: AssistantCar[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
      {
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
            maxOutputTokens: 420
          }
        }),
        cache: "no-store",
        signal: controller.signal
      }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gemini model ${model} timed out.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const result = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(
      `Gemini model ${model} returned ${response.status}: ${
        result.error?.message ?? "request failed"
      }`
    );
  }

  const candidate = result.candidates?.[0];
  const reply = candidate?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!reply) {
    const reason =
      result.promptFeedback?.blockReason || candidate?.finishReason || "empty response";
    throw new Error(`Gemini model ${model} returned no text (${reason}).`);
  }

  return reply;
}

function dealerContactSentence() {
  const email = dealerEmail();
  const emailOption = email ? `, or email ${email}` : "";

  return `Call ${dealerPhone()}, WhatsApp https://wa.me/${dealerWhatsApp()}${emailOption}.`;
}

function formatCarList(cars: AssistantCar[]) {
  return cars
    .map(
      (car) =>
        `• ${car.year} ${car.brand} ${car.model} — ${formatPrice(car.price)}, ${formatMileage(
          car.mileage
        )}, ${titleCaseEnum(car.fuelType)}, ${titleCaseEnum(
          car.transmission
        )}. ${siteUrl()}/cars/${car.slug}`
    )
    .join("\n");
}

function findNamedCars(message: string, cars: AssistantCar[]) {
  const ignoredModelWords = new Set([
    "amg",
    "automatic",
    "hybrid",
    "line",
    "long",
    "model",
    "quattro",
    "range",
    "sport"
  ]);

  return cars.filter((car) => {
    const brand = car.brand.toLowerCase();
    const model = car.model.toLowerCase();
    const modelTokens = model
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !ignoredModelWords.has(token));

    return (
      message.includes(brand) ||
      message.includes(model) ||
      modelTokens.some((token) => message.includes(token))
    );
  });
}

function carSearchText(car: AssistantCar) {
  return [
    car.brand,
    car.model,
    car.engine,
    car.condition,
    car.description,
    ...car.features
  ]
    .join(" ")
    .toLowerCase();
}

type RankingPreferences = {
  wantsFamily: boolean;
  wantsDailyDriver: boolean;
  wantsEconomy: boolean;
  wantsLuxury: boolean;
  wantsPerformance: boolean;
  wantsSafety: boolean;
};

function scoreCar(car: AssistantCar, preferences: RankingPreferences) {
  const text = carSearchText(car);
  let score = 0;

  if (preferences.wantsFamily) {
    if (/\b(?:family|suv|practical|tailgate|spacious)\b/.test(text)) score += 5;
    if (/\b(?:safety|blind spot|lane|parking|camera|cruise)\b/.test(text)) score += 3;
  }

  if (preferences.wantsDailyDriver) {
    if (car.fuelType === "HYBRID" || car.fuelType === "ELECTRIC") score += 5;
    if (car.price <= 35_000) score += 3;
    if (car.mileage <= 32_000) score += 2;
  }

  if (preferences.wantsEconomy) {
    if (car.fuelType === "HYBRID") score += 6;
    if (car.fuelType === "ELECTRIC") score += 5;
    if (/\b(?:efficient|running costs?|reliability)\b/.test(text)) score += 3;
  }

  if (preferences.wantsLuxury) {
    if (
      /\b(?:premium|luxury|leather|panoramic|audio|ambient|quiet|refined|comfort)\b/.test(
        text
      )
    ) {
      score += 6;
    }
  }

  if (preferences.wantsPerformance) {
    if (/\b(?:sport|turbo|v6|dual motor|all-wheel|quattro|performance)\b/.test(text)) {
      score += 6;
    }
  }

  if (preferences.wantsSafety) {
    const safetyFeatures = car.features.filter((feature) =>
      /\b(?:safety|blind spot|lane|camera|parking|cruise|autopilot)\b/i.test(feature)
    ).length;
    score += safetyFeatures * 2;
  }

  return score;
}

function buildContents(input: AssistantRequest) {
  const history: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const message of input.history.slice(-6)) {
    const role = message.role === "assistant" ? "model" : "user";

    if (history.length === 0 && role === "model") {
      continue;
    }

    const previous = history.at(-1);

    if (previous?.role === role) {
      previous.parts[0].text = `${previous.parts[0].text}\n\n${message.content}`;
    } else {
      history.push({
        role,
        parts: [{ text: message.content }]
      });
    }
  }

  const lastMessage = history.at(-1);

  if (lastMessage?.role === "user") {
    lastMessage.parts[0].text = `${lastMessage.parts[0].text}\n\n${input.message}`;
  } else {
    history.push({
      role: "user",
      parts: [{ text: input.message }]
    });
  }

  return history;
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
Answer the buyer's actual question directly. If the requested fact is not in the inventory or dealer information, say that it is not confirmed and offer the correct contact route instead of changing the subject.
All prices must be shown in RM. Keep replies concise, helpful, and friendly, usually under 120 words.
Recommend up to 3 vehicles at a time and include the vehicle page URL when useful.
Encourage the buyer to contact the dealer for viewing, booking, trade-in, financing, or final availability.
Do not ask for sensitive identity or banking details.
Dealer phone: ${dealerPhone()}
Dealer WhatsApp: https://wa.me/${dealerWhatsApp()}
Dealer email: ${dealerEmail() || "Not provided"}
Dealer address: ${dealerAddress() || "Not provided"}
Dealer hours: ${dealerHours() || "Not provided"}

Current inventory:
${inventory || "No available or reserved vehicles are currently listed."}`;
}

function extractBudget(message: string) {
  const normalized = message.toLowerCase().replace(/,/g, "");
  const rmMatch = normalized.match(
    /(?:rm|under|below|budget(?: of)?|less than|up to|max(?:imum)?)\s*(\d{4,7})/
  );
  const kMatch = normalized.match(/(\d{1,3})\s*k/);
  const thousandMatch = normalized.match(/(\d{1,3})\s*thousand/);

  if (rmMatch?.[1]) {
    return Number(rmMatch[1]);
  }

  if (kMatch?.[1]) {
    return Number(kMatch[1]) * 1000;
  }

  if (thousandMatch?.[1]) {
    return Number(thousandMatch[1]) * 1000;
  }

  return null;
}

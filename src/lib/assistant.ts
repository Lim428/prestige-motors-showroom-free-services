import type { CarStatus } from "@prisma/client";
import { createGoogle } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";
import { vehicleName } from "@/lib/car-display";
import type { AppLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { formatMileage, formatPrice, titleCaseEnum } from "@/lib/format";
import { previewCars } from "@/lib/preview-cars";
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
  stockCode: string | null;
  variant: string | null;
  year: number;
  registrationYear: number | null;
  mileage: number;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  transmission: string;
  fuelType: string;
  engine: string;
  engineCc: number | null;
  seats: number | null;
  doors: number | null;
  drivetrain: string | null;
  assemblyType: string | null;
  showroomLocation: string | null;
  price: number;
  condition: string;
  status: CarStatus;
  description: string;
  features: string[];
};

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GEMINI_TIMEOUT_MS = 15_000;

export type AssistantModeReason = "not_configured" | "provider_error";

export async function getAssistantCars() {
  if (process.env.SHOWROOM_PREVIEW === "true") {
    return previewCars.map((car) => ({
      id: car.id,
      slug: car.slug,
      stockCode: car.stockCode,
      brand: car.brand,
      model: car.model,
      variant: car.variant,
      year: car.year,
      registrationYear: car.registrationYear,
      mileage: car.mileage,
      bodyType: car.bodyType,
      exteriorColor: car.exteriorColor,
      interiorColor: car.interiorColor,
      transmission: car.transmission,
      fuelType: car.fuelType,
      engine: car.engine,
      engineCc: car.engineCc,
      seats: car.seats,
      doors: car.doors,
      drivetrain: car.drivetrain,
      assemblyType: car.assemblyType,
      showroomLocation: car.showroomLocation,
      price: car.price,
      condition: car.condition,
      status: car.status,
      description: car.description,
      features: car.features
    }));
  }

  const cars = await prisma.car.findMany({
    where: { isPublished: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 18,
    select: {
      id: true,
      slug: true,
      stockCode: true,
      brand: true,
      model: true,
      variant: true,
      year: true,
      registrationYear: true,
      mileage: true,
      bodyType: true,
      exteriorColor: true,
      interiorColor: true,
      transmission: true,
      fuelType: true,
      engine: true,
      engineCc: true,
      seats: true,
      doors: true,
      drivetrain: true,
      assemblyType: true,
      showroomLocation: true,
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

export function buildFallbackReply(
  message: string,
  cars: AssistantCar[],
  locale: AppLocale = "en",
  history: AssistantRequest["history"] = []
) {
  const copy = assistantCopy(locale);
  const contact = dealerContactSentence(locale);
  const lowerMessage = message.toLowerCase().replace(/[’']/g, "'");

  if (
    /^(?:hi|hello|hey|good (?:morning|afternoon|evening)|hai|helo|selamat (?:pagi|petang|malam)|你好|您好|嗨|早上好|下午好|晚上好)[!.?！。\s]*$/i.test(
      message.trim()
    )
  ) {
    return copy.greeting;
  }

  if (
    /\b(opening hours?|business hours?|what time|when (?:are|do) you open|when (?:are|do) you close|weekends?|open today|waktu operasi|jam buka|bila buka|bila tutup|hujung minggu)\b/.test(
      lowerMessage
    ) || /营业时间|几点开门|几点关门|周末|今天开门/.test(message)
  ) {
    const hours = dealerHours();

    return hours ? copy.hoursPublished(hours, contact) : copy.hoursUnknown(contact);
  }

  if (
    /\b(address|location|located|where (?:are|is) (?:you|the showroom)|alamat|lokasi|di mana)\b/.test(
      lowerMessage
    ) || /地址|位置|在哪里/.test(message)
  ) {
    const address = dealerAddress();

    return address ? copy.addressPublished(address, contact) : copy.addressUnknown(contact);
  }

  if (
    /\b(contact|phone|call|whatsapp|email|reach you|hubungi|telefon|emel)\b/.test(
      lowerMessage
    ) || /联系|电话|邮箱|电邮/.test(message)
  ) {
    return contact;
  }

  if (
    /\b(financ(?:e|ing)|loan|instal+ments?|monthly payment|deposit|down payment|pembiayaan|pinjaman|ansuran|bayaran bulanan)\b/.test(
      lowerMessage
    ) || /贷款|融资|月供|首付|订金/.test(message)
  ) {
    return copy.finance(contact);
  }

  if (
    /\b(trade[ -]?in|trade my|part exchange|sell my car|tukar beli|jual kereta)\b/.test(
      lowerMessage
    ) || /置换|以旧换新|卖车/.test(message)
  ) {
    return copy.tradeIn(contact);
  }

  if (
    /\b(test drive|viewing|book|reserve|appointment|pandu uji|temu janji|temujanji|tempahan)\b/.test(
      lowerMessage
    ) || /试驾|看车|预约|预订/.test(message)
  ) {
    return copy.viewing(contact);
  }

  if (
    /\b(warrant(?:y|ies)|guarantee|return policy|waranti|jaminan|polisi pemulangan)\b/.test(
      lowerMessage
    ) || /保修|质保|退货/.test(message)
  ) {
    return copy.warranty(contact);
  }

  if (cars.length === 0) {
    return copy.noListings(contact);
  }

  const availableCars = cars.filter((car) => car.status === "AVAILABLE");
  const explicitlyNamedCars = findNamedCars(lowerMessage, cars);
  const contextualCars =
    explicitlyNamedCars.length === 0 && isContextualFollowUp(lowerMessage, message)
      ? findRecentConversationCars(history, cars)
      : [];
  const namedCars =
    explicitlyNamedCars.length > 0 ? explicitlyNamedCars : contextualCars;
  const budget = extractBudget(message);
  const requestedFuel = requestedFuelType(lowerMessage, message);
  const requestedTransmission = /\b(?:manual)\b|手动/.test(lowerMessage)
    ? "manual"
    : /\b(?:auto|automatic|automatik)\b|自动/.test(lowerMessage)
      ? "automatic"
      : null;
  const wantsSuv = /\b(?:suv|crossover|4x4)\b/.test(lowerMessage);
  const wantsSedan = /\b(?:sedan|saloon)\b|轿车/.test(lowerMessage);
  const wantsFamily = /\b(?:family|children|kids|child|practical|spacious|keluarga|anak|praktikal|luas)\b|家庭|孩子|宽敞/.test(lowerMessage);
  const wantsDailyDriver = /\b(?:daily|commut(?:e|er|ing)|city driving|work car|harian|ulang-alik|pemanduan bandar)\b|日常|通勤|城市驾驶/.test(
    lowerMessage
  );
  const wantsEconomy = /\b(?:economical|economy|fuel efficient|save fuel|low running cost|ekonomi|jimat minyak|kos operasi rendah)\b|省油|经济|低用车成本/.test(
    lowerMessage
  );
  const wantsLuxury = /\b(?:luxury|premium|comfortable|comfort|refined|quiet|mewah|selesa|senyap)\b|豪华|高端|舒适|安静/.test(
    lowerMessage
  );
  const wantsPerformance = /\b(?:fast|performance|sporty|powerful|acceleration|laju|prestasi|berkuasa)\b|快速|性能|运动|动力/.test(
    lowerMessage
  );
  const wantsSafety = /\b(?:safe|safety|driver assistance|selamat|keselamatan|bantuan pemandu)\b|安全|驾驶辅助/.test(lowerMessage);
  const wantsCheapest = /\b(?:cheapest|lowest price|affordable|cheap|budget friendly|termurah|murah|mampu milik)\b|最便宜|低价|实惠/.test(
    lowerMessage
  );
  const wantsNewest = /\b(?:newest|latest|most recent|terbaru)\b|最新|最近/.test(lowerMessage);
  const wantsLowMileage = /\b(?:lowest mileage|low mileage|least mileage|perbatuan rendah)\b|低里程/.test(lowerMessage);
  const seatMatch = lowerMessage.match(/\b([2-9])[\s-]*(?:seat|seater|seats|tempat duduk)\b|([2-9])\s*座/);
  const requestedSeats = seatMatch?.[1] || seatMatch?.[2] ? Number(seatMatch[1] ?? seatMatch[2]) : null;
  const hasRecommendationCriteria = Boolean(
    budget ||
      requestedFuel ||
      requestedTransmission ||
      wantsSuv ||
      wantsSedan ||
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
  );

  if (
    (/\b(available|availability|in stock|reserved|sold|tersedia|dalam stok|ditempah|dijual)\b/.test(
      lowerMessage
    ) || /现货|有货|预订|已售/.test(message)) &&
    !hasRecommendationCriteria
  ) {
    if (namedCars.length > 0) {
      return namedCars
        .slice(0, 3)
        .map(
          (car) =>
            copy.carStatus(
              `${car.year} ${car.brand} ${car.model}`,
              localizedEnum(car.status, locale),
              `${siteUrl()}/cars/${car.slug}`
            )
        )
        .join("\n");
    }

    if (availableCars.length === 0) {
      return copy.noAvailable(contact);
    }

    return copy.availableCount(
      availableCars.length,
      formatCarList(availableCars.slice(0, 3), locale)
    );
  }

  if (contextualCars.length > 0) {
    const selectedCars = contextualCars.slice(0, 3);
    const detail =
      selectedCars.length === 1
        ? copy.detail(
            selectedCars[0].engine,
            selectedCars[0].features.slice(0, 4).join(", ") || copy.noHighlights
          )
        : "";

    return copy.contextDetails(
      formatCarList(selectedCars, locale),
      detail
    );
  }

  if (availableCars.length === 0) {
    const reservedCars = cars.filter((car) => car.status === "RESERVED").slice(0, 3);
    const reservedDetail =
      reservedCars.length > 0
        ? copy.reservedDetail(formatCarList(reservedCars, locale))
        : "";

    return copy.noAvailableWithReserved(reservedDetail, contact);
  }

  let matches = availableCars;
  const constraints: string[] = [];

  if (namedCars.length > 0) {
    const namedIds = new Set(namedCars.map((car) => car.id));
    matches = matches.filter((car) => namedIds.has(car.id));
    constraints.push(copy.constraintModel);
  }

  if (budget) {
    matches = matches.filter((car) => car.price <= budget);
    constraints.push(copy.constraintBudget(formatPrice(budget)));
  }

  if (requestedFuel) {
    matches = matches.filter((car) => car.fuelType.toLowerCase() === requestedFuel);
    constraints.push(localizedEnum(requestedFuel, locale));
  }

  if (requestedTransmission) {
    matches = matches.filter(
      (car) => car.transmission.toLowerCase() === requestedTransmission
    );
    constraints.push(localizedEnum(requestedTransmission, locale));
  }

  if (wantsSuv) {
    matches = matches.filter(
      (car) => car.bodyType?.toLowerCase().includes("suv") || carSearchText(car).includes("suv")
    );
    constraints.push(copy.constraintSuv);
  }

  if (wantsSedan) {
    matches = matches.filter(
      (car) =>
        car.bodyType?.toLowerCase().includes("sedan") || carSearchText(car).includes("sedan")
    );
    constraints.push(copy.constraintSedan);
  }

  if (requestedSeats) {
    matches = matches.filter((car) =>
      car.seats === requestedSeats ||
      new RegExp(`\\b${requestedSeats}[\\s-]*(?:seat|seater|seats)\\b`).test(carSearchText(car))
    );
    constraints.push(copy.constraintSeats(requestedSeats));
  }

  if (matches.length === 0) {
    const exactNonAvailable = namedCars.find((car) => car.status !== "AVAILABLE");

    if (exactNonAvailable) {
      return copy.exactNonAvailable(
        `${exactNonAvailable.year} ${exactNonAvailable.brand} ${exactNonAvailable.model}`,
        localizedEnum(exactNonAvailable.status, locale),
        contact
      );
    }

    if (requestedSeats) {
      return copy.noSeat(requestedSeats, contact);
    }

    const closest = [...availableCars]
      .sort((a, b) => {
        if (budget) {
          return Math.abs(a.price - budget) - Math.abs(b.price - budget);
        }

        return a.price - b.price;
      })
      .slice(0, 2);

    return copy.noMatches(
      constraints.join(", "),
      formatCarList(closest, locale),
      contact
    );
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
    /\b(?:car|vehicle|recommend|option|choose|best|compare|looking for|show me|do you have|kereta|kenderaan|cadang|pilihan|terbaik|banding|cari)\b|汽车|车辆|车|推荐|选择|最好|比较|寻找|有没有/.test(
      lowerMessage
    );

  if (!hasBuyingIntent) {
    return copy.capabilities;
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
  const qualifier = constraints.length > 0 ? copy.qualifier(constraints.join(", ")) : "";
  const detail =
    namedCars.length === 1
      ? copy.detail(shortlist[0].engine, shortlist[0].features.slice(0, 4).join(", "))
      : "";

  return copy.strongest(
    shortlist.length,
    qualifier,
    formatCarList(shortlist, locale),
    detail
  );
}

export async function askGemini(input: AssistantRequest, cars: AssistantCar[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const configuredModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const directModel = configuredModel.replace(/^google\//, "");
  const gatewayModel = configuredModel.includes("/")
    ? configuredModel
    : `google/${configuredModel}`;
  const request = {
    system: buildSystemPrompt(cars, input.locale),
    messages: buildModelMessages(input),
    maxOutputTokens: 420,
    abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS)
  };
  let directError: unknown;

  if (apiKey) {
    try {
      const google = createGoogle({ apiKey });
      const { text } = await generateText({ ...request, model: google(directModel) });

      if (text.trim()) {
        return text.trim();
      }

      throw new Error("Gemini returned an empty response.");
    } catch (error) {
      directError = error;
      console.warn("Direct Gemini assistant is unavailable; trying Vercel AI Gateway.");
    }
  }

  const gatewayConfigured = Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim() ||
      process.env.VERCEL
  );

  if (!gatewayConfigured) {
    if (directError) {
      throw directError;
    }

    return null;
  }

  const { text } = await generateText({
    ...request,
    model: gatewayModel,
    providerOptions: {
      gateway: {
        tags: ["feature:buyer-assistant"]
      }
    }
  });

  if (!text.trim()) {
    throw new Error(`Gemini model ${gatewayModel} returned no text.`);
  }

  return text.trim();
}

function dealerContactSentence(locale: AppLocale) {
  const email = dealerEmail();
  return assistantCopy(locale).contact(
    dealerPhone(),
    `https://wa.me/${dealerWhatsApp()}`,
    email || null
  );
}

function formatCarList(cars: AssistantCar[], locale: AppLocale) {
  return cars
    .map(
      (car) =>
        `• ${vehicleName(car)} — ${formatPrice(car.price)}, ${formatMileage(
          car.mileage
        )}, ${localizedEnum(car.fuelType, locale)}, ${localizedEnum(
          car.transmission,
          locale
        )}. ${siteUrl()}/cars/${car.slug}`
    )
    .join("\n");
}

type AssistantCopy = {
  contact: (phone: string, whatsapp: string, email: string | null) => string;
  noListings: (contact: string) => string;
  greeting: string;
  hoursPublished: (hours: string, contact: string) => string;
  hoursUnknown: (contact: string) => string;
  addressPublished: (address: string, contact: string) => string;
  addressUnknown: (contact: string) => string;
  finance: (contact: string) => string;
  tradeIn: (contact: string) => string;
  viewing: (contact: string) => string;
  warranty: (contact: string) => string;
  contextDetails: (list: string, detail: string) => string;
  noHighlights: string;
  carStatus: (name: string, status: string, url: string) => string;
  noAvailable: (contact: string) => string;
  availableCount: (count: number, list: string) => string;
  reservedDetail: (list: string) => string;
  noAvailableWithReserved: (reserved: string, contact: string) => string;
  constraintModel: string;
  constraintBudget: (budget: string) => string;
  constraintSuv: string;
  constraintSedan: string;
  constraintSeats: (seats: number) => string;
  exactNonAvailable: (name: string, status: string, contact: string) => string;
  noSeat: (seats: number, contact: string) => string;
  noMatches: (constraints: string, list: string, contact: string) => string;
  capabilities: string;
  qualifier: (constraints: string) => string;
  detail: (engine: string, highlights: string) => string;
  strongest: (count: number, qualifier: string, list: string, detail: string) => string;
};

function assistantCopy(locale: AppLocale): AssistantCopy {
  if (locale === "ms") {
    return {
      contact: (phone, whatsapp, email) =>
        `Hubungi ${phone}, WhatsApp ${whatsapp}${email ? `, atau e-mel ${email}` : ""}.`,
      noListings: (contact) =>
        `Saya tidak melihat sebarang senarai semasa buat masa ini. ${contact}`,
      greeting:
        "Helo! Beritahu saya bajet, jenis bahan api pilihan, atau cara anda akan menggunakan kereta, dan saya akan membandingkan senarai semasa untuk anda.",
      hoursPublished: (hours, contact) =>
        `Waktu operasi bilik pameran yang diterbitkan ialah ${hours}. Sila sahkan sebelum datang. ${contact}`,
      hoursUnknown: (contact) =>
        `Waktu operasi bilik pameran belum diterbitkan dalam maklumat semasa saya. ${contact}`,
      addressPublished: (address, contact) =>
        `Bilik pameran terletak di ${address}. ${contact}`,
      addressUnknown: (contact) =>
        `Alamat bilik pameran belum diterbitkan dalam maklumat semasa saya. ${contact}`,
      finance: (contact) =>
        `Pembiayaan dan bayaran bulanan bergantung pada kenderaan, deposit, pemberi pinjaman, dan kelayakan pembeli. Saya tidak boleh menjanjikan kelulusan atau ansuran tepat di sini. ${contact}`,
      tradeIn: (contact) =>
        `Bilik pameran boleh menilai tukar beli selepas memeriksa keadaan, perbatuan, dan butiran pemilikan kenderaan. ${contact}`,
      viewing: (contact) =>
        `Anda boleh memohon sesi melihat atau pandu uji untuk kenderaan yang tersedia, tetapi bilik pameran perlu mengesahkan masa dan ketersediaan akhir. ${contact}`,
      warranty: (contact) =>
        `Perlindungan waranti tidak disahkan dalam data senarai dan mungkin berbeza mengikut kenderaan. Minta perlindungan bertulis daripada bilik pameran sebelum membuat keputusan. ${contact}`,
      contextDetails: (list, detail) =>
        `Butiran yang disahkan untuk kenderaan daripada jawapan terakhir saya:\n${list}${detail}`,
      noHighlights: "Tiada ciri utama yang diterbitkan",
      carStatus: (name, status, url) => `${name} kini ${status}. ${url}`,
      noAvailable: (contact) =>
        `Tiada kenderaan ditandakan sebagai tersedia buat masa ini. ${contact}`,
      availableCount: (count, list) =>
        `${count} kenderaan ditandakan sebagai tersedia sekarang:\n${list}`,
      reservedDetail: (list) => ` Kenderaan yang ditempah sekarang:\n${list}`,
      noAvailableWithReserved: (reserved, contact) =>
        `Tiada kenderaan ditandakan sebagai tersedia buat masa ini.${reserved}\n${contact}`,
      constraintModel: "model tersebut",
      constraintBudget: (budget) => `bajet ${budget}`,
      constraintSuv: "sebuah SUV",
      constraintSedan: "sebuah sedan",
      constraintSeats: (seats) => `${seats} tempat duduk`,
      exactNonAvailable: (name, status, contact) =>
        `${name} kini ${status}, jadi saya tidak boleh menyatakannya sebagai tersedia. ${contact}`,
      noSeat: (seats, contact) =>
        `Tiada senarai semasa yang mengesahkan susun atur ${seats} tempat duduk. ${contact}`,
      noMatches: (constraints, list, contact) =>
        `Saya tidak menemui senarai tersedia yang mengesahkan ${constraints}. Pilihan semasa yang paling hampir ialah:\n${list}\n${contact}`,
      capabilities:
        "Saya boleh membantu dengan kenderaan semasa, harga, ketersediaan, ciri, bajet, jenis bahan api, tukar beli, pembiayaan, dan sesi melihat. Apakah yang anda ingin tahu?",
      qualifier: (constraints) => ` untuk ${constraints}`,
      detail: (engine, highlights) =>
        `\nEnjin: ${engine}. Sorotan: ${highlights}.`,
      strongest: (_count, qualifier, list, detail) =>
        `Padanan semasa yang paling sesuai${qualifier}:\n${list}${detail}`
    };
  }

  if (locale === "zh") {
    return {
      contact: (phone, whatsapp, email) =>
        `请致电 ${phone}、通过 WhatsApp ${whatsapp} 联系我们${email ? `，或发送电邮至 ${email}` : ""}。`,
      noListings: (contact) => `目前没有可查看的车辆列表。${contact}`,
      greeting:
        "您好！请告诉我您的预算、偏好的燃料类型或用车需求，我会根据当前在售车辆为您比较合适的选择。",
      hoursPublished: (hours, contact) =>
        `展厅公布的营业时间为 ${hours}。出发前请先确认。${contact}`,
      hoursUnknown: (contact) => `目前资料中尚未公布展厅营业时间。${contact}`,
      addressPublished: (address, contact) => `展厅地址是 ${address}。${contact}`,
      addressUnknown: (contact) => `目前资料中尚未公布展厅地址。${contact}`,
      finance: (contact) =>
        `融资和月供取决于车辆、首付、贷款机构及买家资格，因此我无法在这里承诺获批或提供准确月供。${contact}`,
      tradeIn: (contact) =>
        `展厅可在检查车辆状况、里程和所有权资料后进行旧车置换估价。${contact}`,
      viewing: (contact) =>
        `您可以申请看车或试驾现货车辆，但具体时间和最终库存需要由展厅确认。${contact}`,
      warranty: (contact) =>
        `车辆列表资料未确认保修范围，且不同车辆可能有所不同。决定前请向展厅索取书面保修说明。${contact}`,
      contextDetails: (list, detail) =>
        `以下是上一条回复中车辆的已确认资料：\n${list}${detail}`,
      noHighlights: "目前没有已公布的主要配置",
      carStatus: (name, status, url) => `${name} 当前状态为${status}。${url}`,
      noAvailable: (contact) => `目前没有标记为现货的车辆。${contact}`,
      availableCount: (count, list) => `目前有 ${count} 辆现货车：\n${list}`,
      reservedDetail: (list) => ` 当前已预订车辆：\n${list}`,
      noAvailableWithReserved: (reserved, contact) =>
        `目前没有标记为现货的车辆。${reserved}\n${contact}`,
      constraintModel: "该车型",
      constraintBudget: (budget) => `预算 ${budget}`,
      constraintSuv: "SUV",
      constraintSedan: "轿车",
      constraintSeats: (seats) => `${seats} 座`,
      exactNonAvailable: (name, status, contact) =>
        `${name} 当前状态为${status}，因此不能作为现货推荐。${contact}`,
      noSeat: (seats, contact) =>
        `目前没有车辆列表确认 ${seats} 座布局。${contact}`,
      noMatches: (constraints, list, contact) =>
        `我没有找到符合${constraints}的现货车辆。最接近的当前选择是：\n${list}\n${contact}`,
      capabilities:
        "我可以协助查询当前车辆、价格、库存、配置、预算、燃料类型、旧车置换、融资和看车预约。您想了解什么？",
      qualifier: (constraints) => `（条件：${constraints}）`,
      detail: (engine, highlights) => `\n引擎：${engine}。亮点：${highlights}。`,
      strongest: (_count, qualifier, list, detail) =>
        `目前最合适的选择${qualifier}：\n${list}${detail}`
    };
  }

  return {
    contact: (phone, whatsapp, email) =>
      `Call ${phone}, WhatsApp ${whatsapp}${email ? `, or email ${email}` : ""}.`,
    noListings: (contact) =>
      `I do not see any current listings right now. ${contact}`,
    greeting:
      "Hello! Tell me your budget, preferred fuel type, or how you will use the car, and I’ll compare the current listings for you.",
    hoursPublished: (hours, contact) =>
      `Our published showroom hours are ${hours}. Please confirm before travelling. ${contact}`,
    hoursUnknown: (contact) =>
      `The showroom hours have not been published in my current information. ${contact}`,
    addressPublished: (address, contact) =>
      `The showroom is at ${address}. ${contact}`,
    addressUnknown: (contact) =>
      `The showroom address has not been published in my current information. ${contact}`,
    finance: (contact) =>
      `Financing and monthly payments depend on the vehicle, deposit, lender, and buyer eligibility, so I can’t promise an approval or exact instalment here. ${contact}`,
    tradeIn: (contact) =>
      `The showroom can assess a trade-in after checking the vehicle’s condition, mileage, and ownership details. ${contact}`,
    viewing: (contact) =>
      `You can request a viewing or test drive for an available vehicle, but the showroom must confirm the time and final availability. ${contact}`,
    warranty: (contact) =>
      `Warranty coverage is not confirmed in the listing data and may differ by vehicle. Please ask the showroom for the written coverage before deciding. ${contact}`,
    contextDetails: (list, detail) =>
      `Here are the confirmed details for the vehicle${list.includes("\n") ? "s" : ""} from my last reply:\n${list}${detail}`,
    noHighlights: "No published feature highlights",
    carStatus: (name, status, url) => `${name} is ${status.toLowerCase()}. ${url}`,
    noAvailable: (contact) =>
      `No vehicle is marked available right now. ${contact}`,
    availableCount: (count, list) =>
      `${count} vehicle${count === 1 ? " is" : "s are"} marked available now:\n${list}`,
    reservedDetail: (list) => ` Current reserved vehicles:\n${list}`,
    noAvailableWithReserved: (reserved, contact) =>
      `No vehicle is marked available right now.${reserved}\n${contact}`,
    constraintModel: "that model",
    constraintBudget: (budget) => `a budget of ${budget}`,
    constraintSuv: "an SUV",
    constraintSedan: "a sedan",
    constraintSeats: (seats) => `${seats} seats`,
    exactNonAvailable: (name, status, contact) =>
      `The ${name} is currently ${status.toLowerCase()}, so I can’t present it as available. ${contact}`,
    noSeat: (seats, contact) =>
      `No current listing confirms a ${seats}-seat layout. ${contact}`,
    noMatches: (constraints, list, contact) =>
      `I couldn’t find an available listing that confirms ${constraints}. Closest current options are:\n${list}\n${contact}`,
    capabilities:
      "I can help with current vehicles, prices, availability, features, budgets, fuel types, trade-ins, financing, and viewings. What would you like to know?",
    qualifier: (constraints) => ` for ${constraints}`,
    detail: (engine, highlights) =>
      `\nEngine: ${engine}. Highlights: ${highlights}.`,
    strongest: (count, qualifier, list, detail) =>
      `The strongest current match${count === 1 ? "" : "es"}${qualifier}:\n${list}${detail}`
  };
}

function localizedEnum(value: string, locale: AppLocale) {
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  const translations: Record<Exclude<AppLocale, "en">, Record<string, string>> = {
    ms: {
      available: "tersedia",
      reserved: "ditempah",
      sold: "terjual",
      petrol: "petrol",
      diesel: "diesel",
      hybrid: "hibrid",
      electric: "elektrik",
      automatic: "automatik",
      manual: "manual"
    },
    zh: {
      available: "现货",
      reserved: "已预订",
      sold: "已售",
      petrol: "汽油",
      diesel: "柴油",
      hybrid: "混合动力",
      electric: "电动",
      automatic: "自动挡",
      manual: "手动挡"
    }
  };

  return locale === "en"
    ? titleCaseEnum(value)
    : translations[locale][normalized] ?? titleCaseEnum(value);
}

function requestedFuelType(lowerMessage: string, originalMessage: string) {
  const fuelPatterns: Array<[string, RegExp]> = [
    ["petrol", /\bpetrol\b|汽油/],
    ["diesel", /\bdiesel\b|柴油/],
    ["hybrid", /\b(?:hybrid|hibrid)\b|混合动力/],
    ["electric", /\b(?:electric|elektrik|ev)\b|电动/]
  ];

  return fuelPatterns.find(([, pattern]) =>
    pattern.test(`${lowerMessage} ${originalMessage}`)
  )?.[0];
}

const ignoredVehicleNameTokens = new Set<string>([
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

function findNamedCars(message: string, cars: AssistantCar[]) {
  const messageTokens = vehicleIdentityTokens(message);

  return cars.filter((car) => {
    const brandTokens = vehicleIdentityTokens(car.brand);
    const modelTokens = vehicleIdentityTokens(car.model);
    const variantTokens = vehicleIdentityTokens(car.variant ?? "");
    const stockCodeTokens = vehicleIdentityTokens(car.stockCode ?? "");
    const significantIdentityTokens = [...brandTokens, ...modelTokens, ...variantTokens].filter(
      (token) => token.length >= 3 && !ignoredVehicleNameTokens.has(token)
    );

    return (
      containsTokenSequence(messageTokens, brandTokens) ||
      containsTokenSequence(messageTokens, modelTokens) ||
      containsMeaningfulVariant(messageTokens, variantTokens) ||
      containsTokenSequence(messageTokens, stockCodeTokens) ||
      significantIdentityTokens.some((token) => messageTokens.includes(token))
    );
  });
}

function vehicleIdentityTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+/g) ?? [];
}

function containsMeaningfulVariant(messageTokens: string[], variantTokens: string[]) {
  if (variantTokens.length === 0) {
    return false;
  }

  const isMeaningful =
    variantTokens.length > 1 ||
    (variantTokens[0].length >= 3 && !ignoredVehicleNameTokens.has(variantTokens[0]));

  return isMeaningful && containsTokenSequence(messageTokens, variantTokens);
}

function containsTokenSequence(messageTokens: string[], candidateTokens: string[]) {
  if (candidateTokens.length === 0 || candidateTokens.length > messageTokens.length) {
    return false;
  }

  return messageTokens.some((_, startIndex) =>
    candidateTokens.every(
      (candidateToken, tokenIndex) => messageTokens[startIndex + tokenIndex] === candidateToken
    )
  );
}

function isContextualFollowUp(lowerMessage: string, originalMessage: string) {
  return (
    /\b(?:it|its|this|that|these|those|one|ones|they|them|their|first|second|third|what about|tell me more|how much|price|cost|mileage|kilomet(?:re|er)s?|features?|specs?|specifications?|engine|gearbox|transmission|fuel|colo(?:u)?r|year|registration|compare|yang ini|yang itu|kereta ini|kereta itu|berapa|harga|perbatuan|ciri|spesifikasi|enjin|warna|banding)\b/.test(
      lowerMessage
    ) ||
    /它|这辆|那辆|这些|那些|第一|第二|第三|多少钱|价格|里程|配置|规格|引擎|变速箱|燃料|颜色|年份|注册|比较|再说一些/.test(
      originalMessage
    )
  );
}

function findRecentConversationCars(
  history: AssistantRequest["history"],
  cars: AssistantCar[]
) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const historyMessage = history[index];

    if (!historyMessage) {
      continue;
    }

    const referencedCars = findNamedCars(historyMessage.content.toLowerCase(), cars);

    if (referencedCars.length > 0) {
      return referencedCars.slice(0, 3);
    }
  }

  return [];
}

function carSearchText(car: AssistantCar) {
  return [
    car.brand,
    car.model,
    car.stockCode,
    car.variant,
    car.bodyType,
    car.exteriorColor,
    car.interiorColor,
    car.engine,
    car.engineCc,
    car.seats ? `${car.seats} seats` : null,
    car.doors ? `${car.doors} doors` : null,
    car.drivetrain,
    car.assemblyType,
    car.showroomLocation,
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

function buildModelMessages(input: AssistantRequest): ModelMessage[] {
  const normalized: Array<{ role: "user" | "assistant"; content: string }> = [];
  const candidateMessages = [
    ...input.history.slice(-6),
    { role: "user" as const, content: input.message }
  ];

  for (const message of candidateMessages) {
    if (normalized.length === 0 && message.role === "assistant") {
      continue;
    }

    const previous = normalized.at(-1);

    if (previous?.role === message.role) {
      previous.content = `${previous.content}\n\n${message.content}`;
    } else {
      normalized.push({ role: message.role, content: message.content });
    }
  }

  return normalized;
}

function buildSystemPrompt(cars: AssistantCar[], locale: AppLocale) {
  const inventory = cars
    .map(
      (car) =>
        [
          vehicleName(car),
          car.stockCode ? `stock code: ${car.stockCode}` : null,
          car.registrationYear ? `registration year: ${car.registrationYear}` : null,
          `status: ${titleCaseEnum(car.status)}`,
          `price: ${formatPrice(car.price)}`,
          `mileage: ${formatMileage(car.mileage)}`,
          `fuel: ${titleCaseEnum(car.fuelType)}`,
          `transmission: ${titleCaseEnum(car.transmission)}`,
          `engine: ${car.engine}`,
          car.engineCc ? `engine capacity: ${car.engineCc} cc` : null,
          car.bodyType ? `body type: ${car.bodyType}` : null,
          car.exteriorColor ? `exterior colour: ${car.exteriorColor}` : null,
          car.interiorColor ? `interior colour: ${car.interiorColor}` : null,
          car.seats ? `seats: ${car.seats}` : null,
          car.doors ? `doors: ${car.doors}` : null,
          car.drivetrain ? `drivetrain: ${car.drivetrain}` : null,
          car.assemblyType ? `assembly/import type: ${car.assemblyType}` : null,
          car.showroomLocation ? `showroom: ${car.showroomLocation}` : null,
          `condition: ${car.condition}`,
          `features: ${car.features.slice(0, 8).join(", ")}`,
          `url: ${siteUrl()}/cars/${car.slug}`
        ].filter(Boolean).join(" | ")
    )
    .join("\n");

  const responseLanguage = {
    en: "English",
    ms: "natural Malaysian Bahasa Melayu",
    zh: "natural Simplified Chinese used in Malaysia"
  }[locale];

  return `You are the online buyer assistant for Prestige Motors, a premium used car dealership.
Use only the supplied inventory. Do not invent vehicles, prices, discounts, warranties, finance approvals, or stock status.
Answer the buyer's actual question directly. If the requested fact is not in the inventory or dealer information, say that it is not confirmed and offer the correct contact route instead of changing the subject.
Reply in ${responseLanguage}. Keep vehicle brands, model names, URLs, email addresses, phone numbers, stock codes, and RM amounts unchanged. If the buyer explicitly requests a different language, follow that request.
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

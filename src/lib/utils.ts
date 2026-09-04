import { clsx, type ClassValue } from "clsx";

const placeholderValuePattern =
  /^(?:your(?:[-_\s]|$)|replace(?:[-_\s]|$)|change[-_\s]?this|todo\b|tbd\b|example\b)/i;
const defaultDealerPhone = "+60127270107";
const defaultDealerEmail = "guozhanlim0428@gmail.com";

function configuredValue(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized || placeholderValuePattern.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeDialablePhone(value: string | undefined) {
  const compact = configuredValue(value)?.replace(/[\s().-]/g, "");

  return compact && /^\+?\d{8,15}$/.test(compact) ? compact : null;
}

function whatsAppDigits(value: string | undefined) {
  const digits = normalizeDialablePhone(value)?.replace(/^\+/, "");

  return digits && /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function dealerPhone() {
  return normalizeDialablePhone(process.env.DEALER_PHONE) ?? defaultDealerPhone;
}

export function dealerWhatsApp() {
  return (
    whatsAppDigits(process.env.DEALER_WHATSAPP) ??
    whatsAppDigits(dealerPhone()) ??
    defaultDealerPhone.replace(/^\+/, "")
  );
}

export function dealerName() {
  return configuredValue(process.env.DEALER_NAME) ?? "Prestige Motors";
}

export function dealerEmail() {
  const email = configuredValue(process.env.DEALER_EMAIL) ?? defaultDealerEmail;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    /\.(?:local|invalid)$/i.test(email) ||
    /@example\.(?:com|org|net)$/i.test(email)
  ) {
    return defaultDealerEmail;
  }

  return email;
}

export function dealerAddress() {
  return configuredValue(process.env.DEALER_ADDRESS);
}

export function dealerHours() {
  return configuredValue(process.env.DEALER_HOURS);
}

export function dealerPhoneDisplay() {
  const phone = dealerPhone().trim();

  if (/^\+603\d{8}$/.test(phone)) {
    return phone.replace(/^(\+60)(3)(\d{4})(\d{4})$/, "$1 $2-$3 $4");
  }

  return phone.startsWith("+60")
    ? phone.replace(/^(\+60)(\d{2})(\d{3})(\d{4})$/, "$1 $2-$3 $4")
    : phone;
}

function normalizedSiteOrigin(value: string | undefined) {
  const configured = configuredValue(value);

  if (!configured) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;

  try {
    const parsed = new URL(candidate);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function siteUrl() {
  const configuredOrigin =
    normalizedSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizedSiteOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizedSiteOrigin(process.env.NEXTAUTH_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL or NEXTAUTH_URL must be configured as a valid HTTPS origin."
    );
  }

  return "http://localhost:3000";
}

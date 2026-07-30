import { clsx, type ClassValue } from "clsx";

const placeholderValuePattern =
  /^(?:your(?:[-_\s]|$)|replace(?:[-_\s]|$)|change[-_\s]?this|todo\b|tbd\b|example\b)/i;
const defaultDealerPhone = "+60312345678";

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
  const email = configuredValue(process.env.DEALER_EMAIL);

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    /\.(?:local|invalid)$/i.test(email) ||
    /@example\.(?:com|org|net)$/i.test(email)
  ) {
    return null;
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

export function siteUrl() {
  const rawUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const url = rawUrl.trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

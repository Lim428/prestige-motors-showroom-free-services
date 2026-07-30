import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function dealerPhone() {
  return process.env.DEALER_PHONE ?? "+60312345678";
}

export function dealerWhatsApp() {
  return (process.env.DEALER_WHATSAPP ?? dealerPhone()).replace(/[^\d]/g, "");
}

export function dealerName() {
  return process.env.DEALER_NAME?.trim() || "Prestige Motors";
}

export function dealerEmail() {
  return process.env.DEALER_EMAIL?.trim() || null;
}

export function dealerAddress() {
  return process.env.DEALER_ADDRESS?.trim() || null;
}

export function dealerHours() {
  return process.env.DEALER_HOURS?.trim() || null;
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
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined) ??
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

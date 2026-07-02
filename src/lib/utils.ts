import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function dealerPhone() {
  return process.env.DEALER_PHONE ?? "+15551234567";
}

export function dealerWhatsApp() {
  return (process.env.DEALER_WHATSAPP ?? dealerPhone()).replace(/[^\d]/g, "");
}

export function siteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  const url = rawUrl.trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

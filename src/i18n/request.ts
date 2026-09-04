import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  type AppLocale,
  defaultLocale,
  isAppLocale,
  localeCookieName,
  localeFromAcceptLanguage
} from "@/i18n/config";

const messageLoaders: Record<AppLocale, () => Promise<Record<string, unknown>>> = {
  en: () => import("@/i18n/messages/en").then((module) => module.default),
  ms: () => import("@/i18n/messages/ms").then((module) => module.default),
  zh: () => import("@/i18n/messages/zh").then((module) => module.default)
};

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const savedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(savedLocale)
    ? savedLocale
    : localeFromAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale;
  const messages = await messageLoaders[locale]();

  return {
    locale,
    messages
  };
});

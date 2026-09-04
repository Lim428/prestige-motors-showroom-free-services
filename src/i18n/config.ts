export const locales = ["en", "ms", "zh"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";
export const localeCookieName = "NEXT_LOCALE";

export const localeOptions: ReadonlyArray<{
  value: AppLocale;
  shortLabel: string;
  label: string;
  htmlLang: string;
}> = [
  { value: "en", shortLabel: "EN", label: "English", htmlLang: "en-MY" },
  { value: "ms", shortLabel: "BM", label: "Bahasa Melayu", htmlLang: "ms-MY" },
  { value: "zh", shortLabel: "中文", label: "简体中文", htmlLang: "zh-CN" }
];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function localeFromAcceptLanguage(value: string | null | undefined): AppLocale {
  if (!value) return defaultLocale;

  for (const item of value.toLowerCase().split(",")) {
    const language = item.split(";")[0]?.trim();

    if (language === "ms" || language?.startsWith("ms-")) return "ms";
    if (language === "zh" || language?.startsWith("zh-")) return "zh";
    if (language === "en" || language?.startsWith("en-")) return "en";
  }

  return defaultLocale;
}

export function htmlLangFor(locale: AppLocale) {
  return localeOptions.find((option) => option.value === locale)?.htmlLang ?? "en-MY";
}

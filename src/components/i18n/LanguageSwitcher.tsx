"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Languages, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  localeOptions,
  type AppLocale
} from "@/i18n/config";

export function LanguageSwitcher() {
  const activeLocale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTranslating, setIsTranslating] = useState(false);
  const locale = isAppLocale(activeLocale) ? activeLocale : defaultLocale;

  useEffect(() => {
    function onTranslationStatus(event: Event) {
      setIsTranslating(
        Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active)
      );
    }

    window.addEventListener("prestige:translation-status", onTranslationStatus);
    return () =>
      window.removeEventListener("prestige:translation-status", onTranslationStatus);
  }, []);

  function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;

    document.cookie = `${localeCookieName}=${nextLocale}; Max-Age=31536000; Path=/; SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      data-no-translate
      className="fixed bottom-4 left-4 z-[65] flex h-11 items-center border border-ink/20 bg-white text-ink shadow-[0_10px_30px_rgba(9,9,9,0.16)] sm:bottom-5 sm:left-5"
    >
      <span className="grid h-full w-10 place-items-center border-r border-ink/15 text-racing" aria-hidden="true">
        {isPending || isTranslating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Languages className="h-4 w-4" />
        )}
      </span>
      <label className="relative h-full">
        <span className="sr-only">{isPending ? t("changing") : t("label")}</span>
        <select
          value={locale}
          onChange={(event) => changeLocale(event.target.value as AppLocale)}
          disabled={isPending}
          aria-label={t("label")}
          className="h-full appearance-none bg-white pl-3 pr-8 text-[0.68rem] font-black uppercase tracking-[0.08em] outline-none transition hover:bg-smoke focus:ring-2 focus:ring-inset focus:ring-racing disabled:cursor-wait"
        >
          {localeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.shortLabel} · {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45"
          aria-hidden="true"
        />
      </label>
    </div>
  );
}

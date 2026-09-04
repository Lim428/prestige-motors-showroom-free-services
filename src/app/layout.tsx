import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/oswald";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "@/app/globals.css";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { WholeProgramTranslator } from "@/components/i18n/WholeProgramTranslator";
import { htmlLangFor, type AppLocale } from "@/i18n/config";
import { siteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: t("title"),
      template: t("titleTemplate", { title: "%s" })
    },
    description: t("description"),
    openGraph: {
      title: "Prestige Motors",
      description: t("openGraphDescription"),
      type: "website",
      url: siteUrl(),
      siteName: "Prestige Motors",
      images: [
        {
          url: "/images/editorial-showroom-hero.jpg",
          alt: "Prestige Motors pre-owned car showroom"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: "Prestige Motors",
      description: t("openGraphDescription"),
      images: ["/images/editorial-showroom-hero.jpg"]
    },
    robots: {
      index: true,
      follow: true
    }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090909"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={htmlLangFor(locale as AppLocale)} data-scroll-behavior="smooth">
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <LanguageSwitcher />
          <WholeProgramTranslator />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

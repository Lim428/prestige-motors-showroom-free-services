import type { Metadata, Viewport } from "next";
import { AiAssistant } from "@/components/assistant/AiAssistant";
import { Header } from "@/components/layout/Header";
import "@/app/globals.css";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Prestige Motors | Premium Second-Hand Car Dealership",
    template: "%s | Prestige Motors"
  },
  description:
    "Browse inspected second-hand cars with premium photos, detailed specifications, and direct dealer contact.",
  openGraph: {
    title: "Prestige Motors",
    description:
      "A premium second-hand car showroom with inspected vehicles and transparent specifications.",
    type: "website",
    url: siteUrl()
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f2ed"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <AiAssistant />
      </body>
    </html>
  );
}

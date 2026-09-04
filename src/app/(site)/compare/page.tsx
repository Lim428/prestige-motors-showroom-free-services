import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComparePageClient } from "@/components/growth/ComparePageClient";
import { siteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.compare");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `${siteUrl()}/compare` }
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ComparePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const rawIds = Array.isArray(resolved.ids) ? resolved.ids : [resolved.ids ?? ""];
  const initialIds = rawIds
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);

  return <ComparePageClient initialIds={initialIds} />;
}

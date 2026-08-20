import type { Metadata } from "next";
import { ComparePageClient } from "@/components/growth/ComparePageClient";

export const metadata: Metadata = {
  title: "Compare Vehicles",
  description: "Compare saved Prestige Motors vehicles side by side by price, mileage, specifications, and equipment."
};

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

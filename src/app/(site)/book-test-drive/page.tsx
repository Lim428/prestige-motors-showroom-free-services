import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { AppointmentForm } from "@/components/growth/AppointmentForm";
import { vehicleName } from "@/lib/car-display";
import { getCars } from "@/lib/cars";
import { dealerAddress, dealerHours, siteUrl } from "@/lib/utils";
import { carQuerySchema } from "@/lib/validators";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.testDrive");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `${siteUrl()}/book-test-drive` }
  };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookTestDrivePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const requestedCar = firstValue(resolved.carId);
  const requestedIntent = firstValue(resolved.intent) === "finance" ? "finance" : "viewing";
  const cars = await getCars(carQuerySchema.parse({ sort: "newest" }));
  const bookableCars = cars.filter((car) => car.status === "AVAILABLE");
  const selectedCar = bookableCars.find(
    (car) => car.id === requestedCar || car.slug === requestedCar
  );
  const vehicles = bookableCars.map((car) => ({
    id: car.id,
    name: `${vehicleName(car)} — ${car.formattedPrice}`,
    status: car.status
  }));
  const address = dealerAddress();
  const hours = dealerHours();

  return (
    <main>
      <section className="border-b-8 border-racing bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link
            href={selectedCar ? `/cars/${selectedCar.slug}` : "/#inventory"}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {selectedCar ? "Back to vehicle" : "Back to inventory"}
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="border-l-8 border-racing pl-3 text-xs font-black uppercase tracking-[0.24em] text-white/70">
              Your private showroom visit
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-black uppercase leading-[0.92] tracking-[-0.025em] sm:text-7xl">
              Drive it. Feel it. Decide clearly.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              {selectedCar
                ? `Request a dedicated appointment for the ${vehicleName(selectedCar)}.`
                : "Select a vehicle and a live showroom time. Our team will prepare everything before you arrive."}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:px-8 lg:py-16">
        <AppointmentForm
          vehicles={vehicles}
          initialCarId={selectedCar?.id}
          initialIntent={requestedIntent}
        />

        <aside className="space-y-5">
          <section className="border border-ink/15 bg-white p-5 sm:p-6">
            <p className="border-l-[6px] border-racing pl-3 text-xs font-black uppercase tracking-[0.18em] text-racing">
              What to expect
            </p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase leading-none text-ink">A visit built around you</h2>
            <ul className="mt-5 space-y-4">
              {[
                "The selected vehicle is prepared before your arrival.",
                "A showroom specialist answers specification and ownership questions.",
                "Bring your driving licence for a test drive, subject to dealer confirmation.",
                "Finance and trade-in discussions are available without obligation."
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-ink/65">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {address || hours ? (
            <section className="border-l-8 border-racing bg-ink p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                Showroom details
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                {address ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
                    <div>
                      <dt className="font-black">Location</dt>
                      <dd className="mt-1 leading-6 text-white/60">{address}</dd>
                    </div>
                  </div>
                ) : null}
                {hours ? (
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
                    <div>
                      <dt className="font-black">Opening hours</dt>
                      <dd className="mt-1 leading-6 text-white/60">{hours}</dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <p className="flex items-start gap-2 px-2 text-xs leading-5 text-ink/45">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
            Appointment requests are handled directly by Prestige Motors, not a third-party lead centre.
          </p>
        </aside>
      </div>
    </main>
  );
}

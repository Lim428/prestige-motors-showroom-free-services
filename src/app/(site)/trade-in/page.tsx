import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, Handshake, ShieldCheck } from "lucide-react";
import { TradeInForm } from "@/components/growth/TradeInForm";
import { siteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.tradeIn");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `${siteUrl()}/trade-in` }
  };
}

export default function TradeInPage() {
  return (
    <main>
      <section className="border-b-8 border-racing bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link
            href="/#inventory"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to showroom
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="border-l-8 border-racing pl-3 text-xs font-black uppercase tracking-[0.24em] text-white/70">
              Your next car starts here
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-black uppercase leading-[0.92] tracking-[-0.025em] sm:text-7xl">
              Turn your current car into your next move.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Build a clear trade-in profile in a few minutes. Your vehicle details and photos go
              directly to the Prestige Motors appraisal team.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)] lg:px-8 lg:py-16">
        <TradeInForm />

        <aside className="space-y-5">
          <section className="border border-ink/15 bg-white p-5 sm:p-6">
            <p className="border-l-[6px] border-racing pl-3 text-xs font-black uppercase tracking-[0.18em] text-racing">
              Three simple steps
            </p>
            <ol className="mt-5 space-y-5">
              {[
                {
                  icon: ClipboardCheck,
                  title: "Describe your car",
                  copy: "Share the model, year, mileage, condition, and any helpful history."
                },
                {
                  icon: Camera,
                  title: "Add clear photos",
                  copy: "Exterior, interior, dashboard, and visible imperfections help us assess it efficiently."
                },
                {
                  icon: Handshake,
                  title: "Discuss the appraisal",
                  copy: "Our team contacts you to inspect the car and confirm a final offer."
                }
              ].map(({ icon: Icon, title, copy }, index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-ink/15 bg-smoke text-racing">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/35">Step {index + 1}</p>
                    <h2 className="mt-1 text-sm font-black text-ink">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-ink/55">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-l-8 border-racing bg-ink p-5 text-white sm:p-6">
            <ShieldCheck className="h-6 w-6 text-racing" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl font-black uppercase leading-none">Clear, private, no obligation</h2>
            <ul className="mt-4 space-y-3">
              {[
                "Your information stays with the showroom team.",
                "The request does not commit you to sell or buy.",
                "A final offer follows an in-person inspection and document check."
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-white/70">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-racing" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

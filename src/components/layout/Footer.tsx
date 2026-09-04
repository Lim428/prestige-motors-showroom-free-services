import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { TrackedContactLink } from "@/components/analytics/TrackedContactLink";
import {
  dealerEmail,
  dealerName,
  dealerPhone,
  dealerPhoneDisplay,
  dealerWhatsApp
} from "@/lib/utils";

const footerLinks = [
  ["Browse inventory", "/#inventory"],
  ["Compare vehicles", "/compare"],
  ["Book a test drive", "/book-test-drive"],
  ["Trade in your car", "/trade-in"],
  ["Create a stock alert", "/#buyer-tools"],
  ["Dealer login", "/admin/login"]
] as const;

export function Footer() {
  const showroomName = dealerName();
  const showroomEmail = dealerEmail();
  const year = new Date().getFullYear();
  const whatsAppMessage = encodeURIComponent(
    "Hi, I would like help choosing a vehicle from the Prestige Motors showroom."
  );

  return (
    <footer id="contact" className="border-t-4 border-racing bg-ink text-white">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid gap-8 border-b border-white/20 py-12 md:grid-cols-[1.25fr_0.75fr] md:items-end md:py-16 lg:gap-16">
          <div>
            <p className="flex items-center gap-3 text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/60">
              <span className="h-[2px] w-8 bg-racing" aria-hidden="true" />
              Your next car starts here
            </p>
            <h2 className="mt-5 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
              Find the car that moves you.
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <Link
              href="/#inventory"
              className="group inline-flex min-h-14 items-center justify-between bg-racing px-5 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-copper"
            >
              Browse inventory
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <TrackedContactLink
              channel="whatsapp"
              href={`https://wa.me/${dealerWhatsApp()}?text=${whatsAppMessage}`}
              className="group inline-flex min-h-14 items-center justify-between border border-white/30 px-5 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp us
              </span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </TrackedContactLink>
          </div>
        </div>

        <div className="grid gap-10 border-b border-white/20 py-12 md:grid-cols-12 md:gap-8 lg:py-14">
          <div className="md:col-span-5 lg:col-span-6">
            <Link
              href="/"
              className="group inline-flex items-center"
              aria-label={`${showroomName} home`}
            >
              <span className="font-display text-[2.45rem] font-bold leading-none tracking-[-0.075em] text-white transition-colors group-hover:text-racing">
                PM
              </span>
              <span className="mx-4 h-10 w-[2px] bg-racing" aria-hidden="true" />
              <span>
                <span className="block text-sm font-black uppercase leading-none tracking-[0.2em]">
                  {showroomName}
                </span>
                <span className="mt-2 block text-[0.62rem] font-medium uppercase tracking-[0.14em] text-white/50">
                  Pre-owned. Carefully selected.
                </span>
              </span>
            </Link>
            <p className="mt-7 max-w-md text-sm leading-7 text-white/60">
              Clear vehicle details, honest guidance and a showroom team ready to help you buy
              with confidence.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="md:col-span-3">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-racing">
              Showroom
            </p>
            <ul className="mt-4 border-t border-white/20">
              {footerLinks.map(([label, href]) => (
                <li key={label} className="border-b border-white/15">
                  <Link
                    href={href}
                    className="group flex min-h-11 items-center justify-between py-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
                  >
                    {label}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 text-white/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-racing"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4 lg:col-span-3 lg:col-start-10">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-racing">
              Talk to our team
            </p>
            <div className="mt-4 border-t border-white/20">
              <TrackedContactLink
                channel="phone"
                href={`tel:${dealerPhone()}`}
                className="flex min-h-14 items-center gap-3 border-b border-white/15 py-3 text-sm font-black text-white transition-colors hover:text-racing"
              >
                <Phone className="h-4 w-4 text-racing" aria-hidden="true" />
                {dealerPhoneDisplay()}
              </TrackedContactLink>
              {showroomEmail ? (
                <a
                  href={`mailto:${showroomEmail}`}
                  className="flex min-h-14 items-center gap-3 break-all border-b border-white/15 py-3 text-sm font-semibold text-white/65 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
                  {showroomEmail}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-6 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {showroomName}. All rights reserved.
          </p>
          <p>Availability and details may change. Confirm with the showroom.</p>
        </div>
      </div>
    </footer>
  );
}

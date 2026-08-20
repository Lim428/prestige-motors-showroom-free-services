import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import { TrackedContactLink } from "@/components/analytics/TrackedContactLink";
import {
  dealerEmail,
  dealerName,
  dealerPhone,
  dealerPhoneDisplay,
  dealerWhatsApp
} from "@/lib/utils";

export function Footer() {
  const showroomName = dealerName();
  const showroomEmail = dealerEmail();
  const year = new Date().getFullYear();
  const whatsAppMessage = encodeURIComponent(
    "Hi, I would like help choosing a vehicle from the Prestige Motors showroom."
  );

  return (
    <footer id="contact" className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 border-b border-white/15 pb-10 md:grid-cols-[1.35fr_0.65fr_0.8fr] md:gap-12">
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
            >
              <span className="grid h-11 w-11 place-items-center rounded-md bg-champagne text-sm font-black text-ink">
                PM
              </span>
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.2em]">
                  {showroomName}
                </span>
                <span className="mt-1 block text-xs text-white/65">
                  Curated pre-owned vehicles
                </span>
              </span>
            </Link>
            <p className="mt-6 text-sm leading-7 text-white/70">
              Explore current stock with clear vehicle details, then speak directly with the
              showroom when a car feels right.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">
              Showroom
            </p>
            <ul className="mt-4 space-y-2">
              {[
                ["Home", "/"],
                ["Browse inventory", "/#inventory"],
                ["Compare saved cars", "/compare"],
                ["Book a test drive", "/book-test-drive"],
                ["Trade in your car", "/trade-in"],
                ["Create a stock alert", "/#buyer-tools"],
                ["Dealer login", "/admin/login"]
              ].map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center text-sm text-white/75 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">
              Talk to the showroom
            </p>
            <div className="mt-4 space-y-3">
              <TrackedContactLink
                channel="phone"
                href={`tel:${dealerPhone()}`}
                className="flex min-h-12 items-center gap-3 rounded-md border border-white/15 px-4 text-sm font-bold text-white transition hover:border-white/35 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                <Phone className="h-4 w-4 text-champagne" aria-hidden="true" />
                {dealerPhoneDisplay()}
              </TrackedContactLink>
              <TrackedContactLink
                channel="whatsapp"
                href={`https://wa.me/${dealerWhatsApp()}?text=${whatsAppMessage}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-racing px-4 text-sm font-bold text-white transition hover:bg-racing/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                <span className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Start on WhatsApp
                </span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </TrackedContactLink>
              {showroomEmail ? (
                <a
                  href={`mailto:${showroomEmail}`}
                  className="inline-flex min-h-11 items-center text-sm text-white/70 underline decoration-white/30 underline-offset-4 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  {showroomEmail}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {showroomName}. All rights reserved.
          </p>
          <p>Vehicle availability and details may change. Confirm with the showroom.</p>
        </div>
      </div>
    </footer>
  );
}

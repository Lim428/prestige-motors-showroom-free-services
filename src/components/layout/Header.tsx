import Link from "next/link";
import { getServerSession } from "next-auth";
import { CalendarDays, MessageCircle, UserRound } from "lucide-react";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { authOptions } from "@/lib/auth";

const navigation = [
  { label: "Inventory", href: "/#inventory" },
  { label: "Compare", href: "/compare" },
  { label: "Contact", href: "/#contact" }
];

export async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8 xl:px-10">
        <Link
          href="/"
          className="group flex min-w-0 shrink-0 items-center"
          aria-label="Prestige Motors home"
        >
          <span className="font-display text-[2rem] font-bold leading-none tracking-[-0.075em] text-ink transition-colors group-hover:text-racing sm:text-[2.35rem]">
            PM
          </span>
          <span className="mx-3 h-9 w-[2px] shrink-0 bg-racing sm:mx-4 sm:h-10" aria-hidden="true" />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-[0.8rem] font-black uppercase leading-none tracking-[0.16em] text-ink md:text-[0.92rem] md:tracking-[0.2em]">
              Prestige Motors
            </span>
            <span className="mt-1.5 hidden truncate text-[0.62rem] font-medium uppercase leading-none tracking-[0.14em] text-ink/55 md:block">
              Pre-owned. Carefully selected.
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
          <MobileNavigation items={navigation} />
          <nav aria-label="Primary navigation" className="hidden items-center lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group relative inline-flex min-h-12 items-center px-3 text-[0.72rem] font-black uppercase tracking-[0.14em] text-ink/75 transition-colors hover:text-ink xl:px-4"
              >
                {item.label}
                <span
                  className="absolute inset-x-3 bottom-1 h-[2px] origin-left scale-x-0 bg-racing transition-transform group-hover:scale-x-100 xl:inset-x-4"
                  aria-hidden="true"
                />
              </Link>
            ))}
            <span className="mx-2 h-7 w-px bg-ink/15 xl:mx-3" aria-hidden="true" />
          </nav>

          <Link
            href="/book-test-drive"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-racing px-3 text-[0.7rem] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-copper sm:min-h-12 sm:px-4 xl:px-5"
          >
            <CalendarDays className="h-4 w-4 shrink-0 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">Book test drive</span>
            <span className="sr-only sm:hidden">Book a test drive</span>
          </Link>

          <Link
            href="/?assistant=open#assistant"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-3 text-[0.7rem] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-graphite sm:min-h-12 sm:px-4 xl:px-5"
            aria-label="Open AI showroom assistant"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline">AI showroom assistant</span>
          </Link>

          <Link
            href={session?.user ? "/admin" : "/admin/login"}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-ink/20 bg-white px-2.5 text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink hover:bg-smoke sm:min-h-12 sm:px-3"
            aria-label={session?.user ? "Open dealer admin" : "Dealer login"}
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline">{session?.user ? "Admin" : "Dealer login"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

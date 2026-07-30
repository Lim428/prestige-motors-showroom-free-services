import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-smoke/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-4 focus-visible:ring-offset-smoke"
            aria-label="Prestige Motors home"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-ink text-sm font-black text-white transition group-hover:bg-graphite">
            PM
          </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black uppercase tracking-[0.18em] text-ink sm:text-sm sm:tracking-[0.22em]">
              Prestige Motors
            </span>
              <span className="mt-0.5 hidden text-xs text-ink/65 sm:block">
                Curated pre-owned vehicles
              </span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/#inventory"
              className="hidden min-h-11 items-center rounded-md px-3 text-sm font-bold text-ink/70 transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing sm:inline-flex"
            >
              Inventory
            </Link>
            <Link
              href="/#experience"
              className="hidden min-h-11 items-center rounded-md px-3 text-sm font-bold text-ink/70 transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing lg:inline-flex"
            >
              Why Prestige
            </Link>
            <Link
              href="/#contact"
              className="hidden min-h-11 items-center rounded-md px-3 text-sm font-bold text-ink/70 transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing md:inline-flex"
            >
              Contact
            </Link>
            {session?.user ? (
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-xs font-bold text-white transition hover:bg-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 focus-visible:ring-offset-smoke sm:text-sm"
              >
                Admin
              </Link>
            ) : (
              <Link
                href="/admin/login"
                className="inline-flex min-h-11 items-center rounded-md border border-ink/20 bg-white px-3 text-xs font-bold text-ink/75 transition hover:border-ink/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing focus-visible:ring-offset-2 focus-visible:ring-offset-smoke sm:px-4 sm:text-sm"
              >
                Dealer login
              </Link>
            )}
          </nav>
      </div>
    </header>
  );
}

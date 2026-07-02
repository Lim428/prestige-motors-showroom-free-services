import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-smoke/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-sm font-black text-white transition group-hover:rotate-3">
            PM
          </span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.22em] text-ink">
              Prestige Motors
            </span>
            <span className="block text-xs text-ink/55">Curated pre-owned vehicles</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/#inventory"
            className="hidden text-sm font-medium text-ink/70 transition hover:text-ink sm:inline"
          >
            Inventory
          </Link>
          {session?.user ? (
            <Link
              href="/admin"
              className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-ink/30 hover:text-ink"
            >
              Admin
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="rounded-full px-2 py-1 text-[11px] font-medium text-ink/35 transition hover:bg-ink/5 hover:text-ink/70"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

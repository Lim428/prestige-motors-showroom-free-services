import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { authOptions } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.adminLogin");
  return {
    title: t("title"),
    robots: { index: false, follow: false }
  };
}

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main
      id="admin-content"
      className="mx-auto grid min-h-screen max-w-[1440px] items-stretch bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.72fr)]"
    >
      <section className="hidden bg-ink px-12 py-16 text-white lg:flex lg:flex-col lg:justify-center" aria-labelledby="admin-welcome-heading">
        <div className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">
          <span className="h-0.5 w-8 bg-copper" />
          Prestige Motors operations
        </div>
        <h2
          id="admin-welcome-heading"
          className="mt-8 max-w-2xl font-display text-7xl font-black uppercase leading-[0.88] tracking-[-0.035em] text-white xl:text-8xl"
        >
          Keep every vehicle and customer follow-up moving.
        </h2>
        <p className="mt-6 max-w-lg text-base leading-7 text-white/60">
          Secure access for the dealership team to manage inventory, listing
          quality, availability, and customer enquiries.
        </p>
        <div className="mt-12 grid max-w-lg grid-cols-3 border-y border-white/15">
          {["Inventory", "Enquiries", "Listings"].map((item, index) => (
            <div
              key={item}
              className={`${index > 0 ? "border-l border-white/15" : ""} px-4 py-5`}
            >
              <p className="text-xs font-black text-copper">0{index + 1}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex w-full items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <LoginForm />
      </div>
    </main>
  );
}

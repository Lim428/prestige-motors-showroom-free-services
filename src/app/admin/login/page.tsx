import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main
      id="admin-content"
      className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,0.72fr)] lg:px-8"
    >
      <section className="hidden lg:block" aria-labelledby="admin-welcome-heading">
        <div className="inline-flex items-center gap-3 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-ink/70 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-racing" />
          Prestige Motors operations
        </div>
        <h2
          id="admin-welcome-heading"
          className="mt-8 max-w-xl text-5xl font-black leading-[1.03] tracking-[-0.04em] text-ink"
        >
          Keep every vehicle and customer follow-up moving.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-ink/70">
          Secure access for the dealership team to manage inventory, listing
          quality, availability, and customer enquiries.
        </p>
        <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
          {["Inventory", "Enquiries", "Listings"].map((item, index) => (
            <div
              key={item}
              className="rounded-md border border-ink/10 bg-white/70 px-4 py-4"
            >
              <p className="text-xs font-black text-copper">0{index + 1}</p>
              <p className="mt-2 text-sm font-bold text-ink">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="w-full max-w-md justify-self-center lg:max-w-none">
        <LoginForm />
      </div>
    </main>
  );
}

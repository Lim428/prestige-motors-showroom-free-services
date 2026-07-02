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
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full">
        <LoginForm />
      </div>
    </main>
  );
}

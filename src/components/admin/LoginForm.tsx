"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError("");
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
        callbackUrl: searchParams.get("callbackUrl") ?? "/admin"
      });

      if (!result?.ok) {
        setError("Invalid administrator credentials.");
        return;
      }

      router.replace(result.url ?? "/admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-ink/10 bg-white p-6 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-md bg-ink text-white">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-ink">Admin login</h1>
          <p className="text-sm text-ink/55">Restricted dealership access</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
        <label>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-smoke px-3 text-sm outline-none focus:border-ink/35 focus:bg-white"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      <Button type="submit" className="mt-6 w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

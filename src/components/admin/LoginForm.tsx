"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const fieldClassName =
  "mt-2 h-12 w-full rounded-md border border-ink/20 bg-smoke px-3 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-ink focus:bg-white focus:ring-2 focus:ring-ink/15";

function safeCallbackUrl(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError("");
      const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

      try {
        const result = await signIn("credentials", {
          email: formData.get("email"),
          password: formData.get("password"),
          redirect: false,
          callbackUrl
        });

        if (!result?.ok) {
          setError(
            "Those credentials were not recognised. Check the email and password, then try again."
          );
          return;
        }

        router.replace(result.url ?? callbackUrl);
        router.refresh();
      } catch {
        setError(
          "Sign in is temporarily unavailable. Check your connection and try again."
        );
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isPending}
      className="rounded-md border border-ink/10 bg-white p-6 shadow-[0_28px_90px_rgba(17,17,17,0.12)] sm:p-8"
    >
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-ink/70 outline-none transition hover:text-ink focus:ring-2 focus:ring-ink/20 focus:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to showroom
      </Link>

      <div className="mt-7 flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-ink text-white shadow-sm">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-copper">
            Secure workspace
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-ink">
            Sign in to operations
          </h1>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-ink/70">
        Use the administrator account supplied by the dealership owner.
      </p>

      <div className="mt-7 grid gap-5">
        <label htmlFor="admin-email">
          <span className="text-sm font-bold text-ink">Email address</span>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            inputMode="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "admin-login-error" : undefined}
            placeholder="admin@example.com"
            className={fieldClassName}
          />
        </label>

        <label htmlFor="admin-password">
          <span className="text-sm font-bold text-ink">Password</span>
          <span className="relative mt-2 block">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-login-error" : undefined}
              className={`${fieldClassName} mt-0 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-md text-ink/65 outline-none transition hover:bg-ink/5 hover:text-ink focus:ring-2 focus:ring-ink/20"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </span>
        </label>
      </div>

      <div className="mt-5 min-h-6" aria-live="polite" aria-atomic="true">
        {error ? (
          <p
            id="admin-login-error"
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="mt-5 h-12 w-full focus:outline-none focus:ring-2 focus:ring-ink/30 focus:ring-offset-2"
        disabled={isPending}
        icon={
          isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )
        }
      >
        {isPending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="mt-5 text-center text-xs leading-5 text-ink/65">
        Access is monitored and limited to authorised dealership staff.
      </p>
    </form>
  );
}

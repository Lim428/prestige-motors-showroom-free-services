import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BellRing, CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata.alertConfirm");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false }
  };
}

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function maskedEmail(value: string) {
  const [local, domain] = value.split("@");
  return local && domain ? `${local.slice(0, 1)}***@${domain}` : "your email address";
}

export default async function ConfirmAlertPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const token = firstValue(resolved.token);
  const state = firstValue(resolved.state);
  const alert =
    token && /^[0-9a-f-]{36}$/i.test(token)
      ? await prisma.stockAlert.findUnique({
          where: { verificationToken: token },
          select: {
            email: true,
            type: true,
            status: true,
            verifiedAt: true,
            verificationExpiresAt: true
          }
        })
      : null;
  const completed =
    state === "done" || Boolean(alert?.verifiedAt && alert.status !== "UNSUBSCRIBED");
  const expired =
    state === "expired" ||
    Boolean(
      alert &&
        !alert.verifiedAt &&
        alert.verificationExpiresAt &&
        alert.verificationExpiresAt <= new Date()
    );
  const canConfirm =
    Boolean(alert && token) &&
    alert?.status === "PENDING_VERIFICATION" &&
    !completed &&
    !expired;

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-14 sm:px-6">
      <section className="w-full max-w-xl overflow-hidden border border-ink/15 bg-white">
        <div className="border-b-8 border-racing bg-ink p-6 text-white sm:p-8">
          <span
            className={`grid h-12 w-12 place-items-center border text-white ${
              completed
                ? "border-emerald-400/40 bg-emerald-600"
                : "border-white/25 bg-racing"
            }`}
          >
            {completed ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : expired ? (
              <BellRing className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MailCheck className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-white/60">
            Secure vehicle alerts
          </p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em]">
            {completed
              ? "Your vehicle alert is active."
              : expired
                ? "This confirmation link has expired."
                : "Confirm your email address."}
          </h1>
        </div>

        <div className="p-6 sm:p-8">
          {completed ? (
            <p className="text-sm leading-7 text-ink/65">
              Your email address is verified. We will now send relevant matches using your
              selected contact preference.
            </p>
          ) : expired ? (
            <p role="alert" className="border-l-4 border-amber-600 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              For your security, confirmation links expire after 48 hours. Create a new alert to
              receive a fresh link.
            </p>
          ) : canConfirm && alert && token ? (
            <>
              <p className="text-sm leading-7 text-ink/65">
                Activate {alert.type.toLowerCase().replaceAll("_", " ")} updates for {" "}
                <strong className="text-ink">{maskedEmail(alert.email)}</strong>. Nothing is sent
                until you confirm.
              </p>
              <form action="/api/alerts/confirm" method="post" className="mt-6">
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="inline-flex min-h-12 w-full items-center justify-center bg-racing px-5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/25 focus-visible:ring-offset-2"
                >
                  Confirm and activate alert
                </button>
              </form>
            </>
          ) : (
            <p role="alert" className="border-l-4 border-amber-600 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              This alert link is invalid or the request has already been stopped. Create a new
              alert if you still want vehicle updates.
            </p>
          )}

          <Link
            href="/#buyer-tools"
            className="mt-5 inline-flex min-h-11 items-center text-sm font-black text-racing underline decoration-racing/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing"
          >
            {expired ? "Create a new alert" : "Return to the showroom"}
          </Link>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/45">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-racing" aria-hidden="true" />
            Email verification prevents another person from subscribing your address without
            permission.
          </p>
        </div>
      </section>
    </main>
  );
}

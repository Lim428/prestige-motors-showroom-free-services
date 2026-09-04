"use client";

import Link from "next/link";
import { Banknote, CalendarClock, Calculator, Percent, ArrowUpRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { trackGrowthEvent } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-2 h-12 w-full border border-ink/20 bg-white px-4 text-sm font-bold text-ink outline-none transition hover:border-ink/35 focus:border-racing focus-visible:ring-2 focus-visible:ring-racing/20";

const terms = [3, 5, 7, 9];
type FinanceMethod = "REDUCING_BALANCE" | "LEGACY_FLAT";

export type FinanceCalculatorProps = {
  price?: number;
  vehicleName?: string;
  carId?: string;
  className?: string;
  defaultDownPaymentPercent?: number;
  defaultAnnualRate?: number;
  defaultTermYears?: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function FinanceCalculator({
  price = 120_000,
  vehicleName,
  carId,
  className,
  defaultDownPaymentPercent = 10,
  defaultAnnualRate,
  defaultTermYears = 7
}: FinanceCalculatorProps) {
  const id = useId();
  const [purchasePrice, setPurchasePrice] = useState(() => Math.max(price, 1_000));
  const [downPaymentPercent, setDownPaymentPercent] = useState(() =>
    clamp(defaultDownPaymentPercent, 0, 90)
  );
  const [annualRate, setAnnualRate] = useState<number | null>(() =>
    typeof defaultAnnualRate === "number"
      ? clamp(defaultAnnualRate, 0, 20)
      : null
  );
  const [termYears, setTermYears] = useState(() =>
    terms.includes(defaultTermYears) ? defaultTermYears : 7
  );
  const [financeMethod, setFinanceMethod] =
    useState<FinanceMethod>("REDUCING_BALANCE");

  const estimate = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const financedAmount = Math.max(purchasePrice - downPayment, 0);
    const months = termYears * 12;
    const hasAnnualRate = annualRate !== null;
    const calculationRate = annualRate ?? 0;
    let monthlyPayment = 0;

    if (financedAmount > 0 && months > 0) {
      if (financeMethod === "LEGACY_FLAT") {
        const flatInterest = financedAmount * (calculationRate / 100) * termYears;
        monthlyPayment = (financedAmount + flatInterest) / months;
      } else {
        const monthlyRate = (1 + calculationRate / 100) ** (1 / 12) - 1;

        monthlyPayment =
          monthlyRate === 0
            ? financedAmount / months
            : (financedAmount * monthlyRate * (1 + monthlyRate) ** months) /
              ((1 + monthlyRate) ** months - 1);
      }
    }

    const totalRepayment = monthlyPayment * months;
    const totalInterest = Math.max(totalRepayment - financedAmount, 0);

    return {
      downPayment,
      financedAmount,
      totalInterest,
      totalRepayment,
      monthlyPayment,
      hasAnnualRate
    };
  }, [annualRate, downPaymentPercent, financeMethod, purchasePrice, termYears]);

  const quoteHref = carId
    ? `/book-test-drive?carId=${encodeURIComponent(carId)}&intent=finance`
    : "/book-test-drive?intent=finance";

  return (
    <section
      aria-labelledby="finance-calculator-title"
      className={cn(
        "overflow-hidden border border-ink/15 bg-white",
        className
      )}
    >
      <div className="border-b-8 border-racing bg-ink px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center border border-white/25 bg-racing text-white">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
              Plan with confidence
            </p>
            <h2 id="finance-calculator-title" className="mt-3 font-display text-3xl font-black uppercase leading-none tracking-[-0.02em]">
              Estimate your monthly payment
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              {vehicleName
                ? `Explore a payment plan for the ${vehicleName}.`
                : "Adjust the figures to explore a payment plan that suits you."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1fr_0.9fr]">
        <div className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <fieldset className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <legend className="text-sm font-bold text-ink/75">Calculation method</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                {
                  value: "REDUCING_BALANCE" as const,
                  title: "Reducing balance (EIR)",
                  copy: "Interest is calculated on the outstanding balance."
                },
                {
                  value: "LEGACY_FLAT" as const,
                  title: "Legacy flat rate",
                  copy: "Shown only for transitional lender quotations."
                }
              ]).map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`${id}-finance-method`}
                    value={option.value}
                    checked={financeMethod === option.value}
                    onChange={() => {
                      setFinanceMethod(option.value);
                      setAnnualRate(null);
                    }}
                    className="peer sr-only"
                  />
                  <span className="block min-h-[5.25rem] border border-ink/20 bg-smoke p-3 text-left transition peer-checked:border-racing peer-checked:bg-racing/5 peer-focus-visible:ring-2 peer-focus-visible:ring-racing peer-focus-visible:ring-offset-2">
                    <span className="block text-sm font-black text-ink">{option.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-ink/50">{option.copy}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
              <Banknote className="h-4 w-4 text-racing" aria-hidden="true" />
              Vehicle price
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1_000}
              max={10_000_000}
              step={1_000}
              value={purchasePrice}
              onChange={(event) =>
                setPurchasePrice(clamp(Number(event.target.value) || 0, 0, 10_000_000))
              }
              className={inputClass}
              aria-describedby="finance-currency-help"
            />
            <span id="finance-currency-help" className="mt-1.5 block text-xs text-ink/45">
              Malaysian Ringgit (RM)
            </span>
          </label>

          <label>
            <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
              <Percent className="h-4 w-4 text-racing" aria-hidden="true" />
              Down payment
            </span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={90}
                step={1}
                value={downPaymentPercent}
                onChange={(event) =>
                  setDownPaymentPercent(clamp(Number(event.target.value) || 0, 0, 90))
                }
                className={`${inputClass} pr-10`}
              />
              <span className="pointer-events-none absolute right-4 top-[1.45rem] text-sm font-black text-ink/45">
                %
              </span>
            </div>
            <span className="mt-1.5 block text-xs text-ink/45">
              {formatPrice(estimate.downPayment)} upfront
            </span>
          </label>

          <label>
            <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
              <Percent className="h-4 w-4 text-racing" aria-hidden="true" />
              {financeMethod === "REDUCING_BALANCE"
                ? "Lender-provided effective rate (EIR)"
                : "Legacy flat rate"}
            </span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={20}
                step={0.1}
                value={annualRate ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setAnnualRate(value === "" ? null : clamp(Number(value), 0, 20));
                }}
                placeholder="Enter quoted rate"
                className={`${inputClass} pr-16`}
              />
              <span className="pointer-events-none absolute right-4 top-[1.45rem] text-sm font-black text-ink/45">
                % p.a.
              </span>
            </div>
            <span className="mt-1.5 block text-xs leading-5 text-ink/45">
              {financeMethod === "REDUCING_BALANCE"
                ? "Enter the EIR from a lender's written quote. No rate is assumed."
                : "Enter a quoted flat rate only when the lender labels it as a flat rate."}
            </span>
          </label>

          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-bold text-ink/75">
              <CalendarClock className="h-4 w-4 text-racing" aria-hidden="true" />
              Financing term
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {terms.map((term) => (
                <label key={term} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`${id}-finance-term`}
                    value={term}
                    checked={termYears === term}
                    onChange={() => setTermYears(term)}
                    className="peer sr-only"
                  />
                  <span className="grid h-12 place-items-center border border-ink/20 bg-smoke text-sm font-black text-ink/60 transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-racing peer-focus-visible:ring-offset-2">
                    {term}y
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="border-l-8 border-racing bg-smoke p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-racing">
              Estimated instalment
            </p>
            <span className="border border-ink/15 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink/55">
              {financeMethod === "REDUCING_BALANCE" ? "EIR method" : "Legacy method"}
            </span>
          </div>
          <p className="mt-3 font-display text-5xl font-black uppercase leading-none tracking-[-0.03em] text-ink sm:text-6xl">
            {estimate.hasAnnualRate
              ? formatPrice(estimate.monthlyPayment)
              : "Enter a rate"}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink/50">per month for {termYears} years</p>

          <dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink/55">Amount financed</dt>
              <dd className="font-black text-ink">{formatPrice(estimate.financedAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink/55">Estimated interest</dt>
              <dd className="font-black text-ink">
                {estimate.hasAnnualRate ? formatPrice(estimate.totalInterest) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink/55">Total loan repayment</dt>
              <dd className="font-black text-ink">
                {estimate.hasAnnualRate ? formatPrice(estimate.totalRepayment) : "—"}
              </dd>
            </div>
          </dl>

          <Link
            href={quoteHref}
            onClick={() =>
              trackGrowthEvent("FINANCE_CALCULATED", {
                carId,
                metadata: {
                  purchasePrice,
                  downPaymentPercent,
                  annualRate,
                  termYears,
                  financeMethod,
                  estimatedMonthlyPayment: estimate.hasAnnualRate
                    ? Math.round(estimate.monthlyPayment)
                    : null
                }
              })
            }
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-racing px-5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/30 focus-visible:ring-offset-2"
          >
            Get a personalised quote
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-4 text-xs leading-5 text-ink/65">
            Illustration only. Choose the calculation method and enter the matching rate quoted
            by the financier. Approval, rates,
            fees, insurance, and final instalments remain subject to the financier&apos;s assessment
            and written terms. Malaysia&apos;s current hire-purchase framework uses reducing-balance
            calculations and effective interest rates, with a transition period for providers.{" "}
            <a
              href="https://www.bnm.gov.my/-/consumerguide-hpa2026"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-racing underline decoration-racing/30 underline-offset-2"
            >
              Read Bank Negara Malaysia&apos;s consumer guide.
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

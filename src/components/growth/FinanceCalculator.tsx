"use client";

import Link from "next/link";
import { Banknote, CalendarClock, Calculator, Percent, ArrowUpRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import { trackGrowthEvent } from "@/lib/growth-client";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-ink/10 bg-smoke px-4 text-sm font-bold text-ink outline-none transition focus:border-ink/30 focus:bg-white focus-visible:ring-2 focus-visible:ring-racing/20";

const terms = [3, 5, 7, 9];

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
  defaultAnnualRate = 3.2,
  defaultTermYears = 7
}: FinanceCalculatorProps) {
  const id = useId();
  const [purchasePrice, setPurchasePrice] = useState(() => Math.max(price, 1_000));
  const [downPaymentPercent, setDownPaymentPercent] = useState(() =>
    clamp(defaultDownPaymentPercent, 0, 90)
  );
  const [annualRate, setAnnualRate] = useState(() => clamp(defaultAnnualRate, 0, 20));
  const [termYears, setTermYears] = useState(() =>
    terms.includes(defaultTermYears) ? defaultTermYears : 7
  );

  const estimate = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const financedAmount = Math.max(purchasePrice - downPayment, 0);
    const totalInterest = financedAmount * (annualRate / 100) * termYears;
    const totalRepayment = financedAmount + totalInterest;
    const monthlyPayment = totalRepayment / (termYears * 12);

    return { downPayment, financedAmount, totalInterest, totalRepayment, monthlyPayment };
  }, [annualRate, downPaymentPercent, purchasePrice, termYears]);

  const quoteHref = carId
    ? `/book-test-drive?carId=${encodeURIComponent(carId)}&intent=finance`
    : "/book-test-drive?intent=finance";

  return (
    <section
      aria-labelledby="finance-calculator-title"
      className={cn(
        "overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white shadow-panel",
        className
      )}
    >
      <div className="bg-ink px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-champagne text-ink">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-champagne">
              Plan with confidence
            </p>
            <h2 id="finance-calculator-title" className="mt-2 text-2xl font-black tracking-tight">
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
          <label>
            <span className="flex items-center gap-2 text-sm font-bold text-ink/75">
              <Banknote className="h-4 w-4 text-copper" aria-hidden="true" />
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
              <Percent className="h-4 w-4 text-copper" aria-hidden="true" />
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
              <Percent className="h-4 w-4 text-copper" aria-hidden="true" />
              Estimated flat rate
            </span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={20}
                step={0.1}
                value={annualRate}
                onChange={(event) => setAnnualRate(clamp(Number(event.target.value) || 0, 0, 20))}
                className={`${inputClass} pr-16`}
              />
              <span className="pointer-events-none absolute right-4 top-[1.45rem] text-sm font-black text-ink/45">
                % p.a.
              </span>
            </div>
          </label>

          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-bold text-ink/75">
              <CalendarClock className="h-4 w-4 text-copper" aria-hidden="true" />
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
                  <span className="grid h-12 place-items-center rounded-xl border border-ink/10 bg-smoke text-sm font-black text-ink/60 transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-racing peer-focus-visible:ring-offset-2">
                    {term}y
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="rounded-2xl bg-smoke p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-copper">
            Estimated instalment
          </p>
          <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
            {formatPrice(estimate.monthlyPayment)}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink/50">per month for {termYears} years</p>

          <dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink/55">Amount financed</dt>
              <dd className="font-black text-ink">{formatPrice(estimate.financedAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink/55">Estimated interest</dt>
              <dd className="font-black text-ink">{formatPrice(estimate.totalInterest)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink/55">Total loan repayment</dt>
              <dd className="font-black text-ink">{formatPrice(estimate.totalRepayment)}</dd>
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
                  estimatedMonthlyPayment: Math.round(estimate.monthlyPayment)
                }
              })
            }
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-racing px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-racing/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/30 focus-visible:ring-offset-2"
          >
            Get a personalised quote
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-4 text-xs leading-5 text-ink/45">
            Illustration only. Approval, rates, fees, insurance, and final instalments are subject
            to the financier&apos;s assessment and terms.
          </p>
        </div>
      </div>
    </section>
  );
}

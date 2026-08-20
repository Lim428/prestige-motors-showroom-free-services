"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CarFront,
  ChartNoAxesCombined,
  Eye,
  Loader2,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  TrendingUp,
  UsersRound
} from "lucide-react";
import { adminFetch } from "@/components/admin/adminFetch";

type AnalyticsDashboard = {
  period: { from: string; to: string; days: number };
  totals: {
    events: number;
    vehicleViews: number;
    leads: number;
    appointments: number;
    tradeIns: number;
    whatsappClicks: number;
    phoneClicks: number;
  };
  funnel: Array<{ key: string; label: string; count: number }>;
  eventBreakdown: Array<{ event: string; count: number }>;
  topVehicles: Array<{
    carId: string;
    brand: string;
    model: string;
    slug: string;
    views: number;
  }>;
  series: Array<{ date: string; events: number; leads: number }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDashboard(value: unknown): AnalyticsDashboard | null {
  const record = asRecord(value);
  const totals = record ? asRecord(record.totals) : null;
  const period = record ? asRecord(record.period) : null;
  if (!record || !totals || !period) return null;

  const funnel = Array.isArray(record.funnel) ? record.funnel : [];
  const eventBreakdown = Array.isArray(record.eventBreakdown)
    ? record.eventBreakdown
    : [];
  const topVehicles = Array.isArray(record.topVehicles) ? record.topVehicles : [];
  const series = Array.isArray(record.series) ? record.series : [];

  return {
    period: {
      from: asText(period.from),
      to: asText(period.to),
      days: asNumber(period.days)
    },
    totals: {
      events: asNumber(totals.events),
      vehicleViews: asNumber(totals.vehicleViews),
      leads: asNumber(totals.leads),
      appointments: asNumber(totals.appointments),
      tradeIns: asNumber(totals.tradeIns),
      whatsappClicks: asNumber(totals.whatsappClicks),
      phoneClicks: asNumber(totals.phoneClicks)
    },
    funnel: funnel.flatMap((item, index) => {
      const row = asRecord(item);
      return row
        ? [
            {
              key: asText(row.key, `step-${index}`),
              label: asText(row.label, "Step"),
              count: asNumber(row.count)
            }
          ]
        : [];
    }),
    eventBreakdown: eventBreakdown.flatMap((item) => {
      const row = asRecord(item);
      return row
        ? [{ event: asText(row.event, "EVENT"), count: asNumber(row.count) }]
        : [];
    }),
    topVehicles: topVehicles.flatMap((item) => {
      const row = asRecord(item);
      return row && typeof row.carId === "string"
        ? [
            {
              carId: row.carId,
              brand: asText(row.brand),
              model: asText(row.model),
              slug: asText(row.slug),
              views: asNumber(row.views)
            }
          ]
        : [];
    }),
    series: series.flatMap((item) => {
      const row = asRecord(item);
      return row
        ? [
            {
              date: asText(row.date),
              events: asNumber(row.events),
              leads: asNumber(row.leads)
            }
          ]
        : [];
    })
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

function conversionRate(numerator: number, denominator: number) {
  if (denominator <= 0) return "0%";
  return `${Math.min(999, Math.round((numerator / denominator) * 100))}%`;
}

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-MY", { month: "short", day: "numeric" }).format(
        date
      );
}

export function SalesAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/analytics/dashboard?days=${days}`,
        { method: "GET" },
        "Sales analytics could not be loaded."
      );
      const normalized = normalizeDashboard(payload);
      if (!normalized) {
        throw new Error("The analytics response was incomplete.");
      }
      setDashboard(normalized);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Sales analytics could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  const maxDailyEvents = useMemo(
    () => Math.max(1, ...(dashboard?.series.map((point) => point.events) ?? [1])),
    [dashboard]
  );
  const maxFunnel = useMemo(
    () => Math.max(1, ...(dashboard?.funnel.map((step) => step.count) ?? [1])),
    [dashboard]
  );

  if (isLoading && !dashboard) {
    return (
      <div role="status" className="grid min-h-72 place-items-center rounded-md border border-dashed border-ink/15 bg-smoke/30 text-center">
        <div>
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-copper" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink/60">Loading sales analytics</p>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div role="alert" className="grid min-h-72 place-items-center rounded-md border border-red-200 bg-red-50/50 px-5 text-center">
        <div>
          <h3 className="font-black text-red-900">Analytics unavailable</h3>
          <p className="mt-1 text-sm text-red-800">{error}</p>
          <button type="button" onClick={() => void loadDashboard()} className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-300">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />Try again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const metrics = [
    { label: "Vehicle views", value: dashboard.totals.vehicleViews, icon: Eye },
    { label: "New leads", value: dashboard.totals.leads, icon: UsersRound },
    { label: "Appointments", value: dashboard.totals.appointments, icon: CalendarCheck2 },
    { label: "Trade-ins", value: dashboard.totals.tradeIns, icon: CarFront },
    { label: "WhatsApp clicks", value: dashboard.totals.whatsappClicks, icon: MessageCircle },
    { label: "Phone clicks", value: dashboard.totals.phoneClicks, icon: PhoneCall }
  ];

  return (
    <div aria-busy={isLoading}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-ink">Sales analytics</h3>
          <p className="mt-1 text-sm text-ink/65">
            Conversion activity across the last {dashboard.period.days || days} days
          </p>
        </div>
        <div className="flex gap-2">
          <label>
            <span className="sr-only">Analytics period</span>
            <select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)} className="h-11 rounded-md border border-ink/15 bg-white px-3 text-sm font-bold text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/15">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
          <button type="button" onClick={() => void loadDashboard()} disabled={isLoading} aria-label="Refresh analytics" className="grid h-11 w-11 place-items-center rounded-md border border-ink/15 text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-md border border-ink/10 bg-smoke/25 p-4">
              <Icon className="h-5 w-5 text-copper" aria-hidden="true" />
              <p className="mt-4 text-2xl font-black text-ink">{formatNumber(metric.value)}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wide text-ink/55">{metric.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-ink/50">View to lead</p>
          <p className="mt-1 text-2xl font-black text-ink">{conversionRate(dashboard.totals.leads, dashboard.totals.vehicleViews)}</p>
          <p className="mt-1 text-sm text-ink/60">Visitors who became identifiable leads</p>
        </div>
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-ink/50">Lead to appointment</p>
          <p className="mt-1 text-2xl font-black text-ink">{conversionRate(dashboard.totals.appointments, dashboard.totals.leads)}</p>
          <p className="mt-1 text-sm text-ink/60">Leads who booked a sales conversation</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <section aria-labelledby="activity-trend-title" className="rounded-md border border-ink/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 id="activity-trend-title" className="font-black text-ink">Activity trend</h4>
              <p className="mt-1 text-xs text-ink/55">Daily events with lead markers</p>
            </div>
            <TrendingUp className="h-5 w-5 text-copper" aria-hidden="true" />
          </div>
          {dashboard.series.length > 0 ? (
            <div className="mt-6 flex h-56 items-end gap-1" aria-label="Daily analytics chart">
              {dashboard.series.map((point) => (
                <div key={point.date} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${shortDate(point.date)}: ${point.events} events, ${point.leads} leads`}>
                  <div className="relative w-full rounded-t bg-ink/15 transition group-hover:bg-copper/50" style={{ height: `${Math.max(4, (point.events / maxDailyEvents) * 100)}%` }}>
                    {point.leads > 0 ? <span className="absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-copper" aria-hidden="true" /> : null}
                  </div>
                  <span className="sr-only">{shortDate(point.date)}: {point.events} events and {point.leads} leads</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-md bg-smoke/50 p-6 text-center text-sm text-ink/55">Activity will appear after customers interact with the showroom.</p>
          )}
        </section>

        <section aria-labelledby="funnel-title" className="rounded-md border border-ink/10 p-4">
          <h4 id="funnel-title" className="font-black text-ink">Conversion funnel</h4>
          <div className="mt-4 grid gap-4">
            {dashboard.funnel.length > 0 ? dashboard.funnel.map((step) => (
              <div key={step.key}>
                <div className="flex justify-between gap-3 text-sm"><span className="font-bold text-ink/70">{step.label}</span><span className="font-black text-ink">{formatNumber(step.count)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-smoke"><div className="h-full rounded-full bg-copper" style={{ width: `${Math.max(2, (step.count / maxFunnel) * 100)}%` }} /></div>
              </div>
            )) : <p className="text-sm text-ink/55">No funnel data yet.</p>}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="vehicles-title" className="rounded-md border border-ink/10 p-4">
          <h4 id="vehicles-title" className="font-black text-ink">Most-viewed vehicles</h4>
          <div className="mt-3 divide-y divide-ink/10">
            {dashboard.topVehicles.length > 0 ? dashboard.topVehicles.map((vehicle, index) => (
              <div key={vehicle.carId} className="flex items-center gap-3 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-smoke text-xs font-black text-ink/55">{index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-ink">{vehicle.brand} {vehicle.model}</p><p className="text-xs text-ink/50">{formatNumber(vehicle.views)} views</p></div>
                {vehicle.slug ? <Link href={`/cars/${vehicle.slug}`} aria-label={`View ${vehicle.brand} ${vehicle.model}`} className="rounded px-2 py-1 text-sm font-bold text-copper outline-none hover:underline focus:ring-2 focus:ring-ink/20">Open</Link> : null}
              </div>
            )) : <p className="py-6 text-center text-sm text-ink/55">Vehicle rankings will appear after page views are recorded.</p>}
          </div>
        </section>

        <section aria-labelledby="events-title" className="rounded-md border border-ink/10 p-4">
          <h4 id="events-title" className="font-black text-ink">Event breakdown</h4>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {dashboard.eventBreakdown.length > 0 ? dashboard.eventBreakdown.map((item) => (
              <div key={item.event} className="rounded-md bg-smoke/55 p-3"><p className="text-lg font-black text-ink">{formatNumber(item.count)}</p><p className="mt-1 truncate text-[11px] font-black uppercase tracking-wide text-ink/50">{titleCase(item.event)}</p></div>
            )) : <p className="col-span-2 py-6 text-center text-sm text-ink/55">No event data yet.</p>}
          </div>
        </section>
      </div>

      <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-ink/45">
        <ChartNoAxesCombined className="h-4 w-4" aria-hidden="true" />
        {formatNumber(dashboard.totals.events)} total tracked events in this period
      </p>
    </div>
  );
}

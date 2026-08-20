"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import {
  BellRing,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  HandCoins,
  UsersRound
} from "lucide-react";
import { AppointmentManager } from "@/components/admin/growth/AppointmentManager";
import { AlertNotificationManager } from "@/components/admin/growth/AlertNotificationManager";
import { LeadPipeline } from "@/components/admin/growth/LeadPipeline";
import { SalesAnalytics } from "@/components/admin/growth/SalesAnalytics";
import { TradeInManager } from "@/components/admin/growth/TradeInManager";
import { TrustPackEditor } from "@/components/admin/growth/TrustPackEditor";
import { cn } from "@/lib/utils";

export type GrowthSection =
  | "leads"
  | "appointments"
  | "trade-ins"
  | "alerts"
  | "analytics"
  | "trust-packs";

export type GrowthAdminIdentity = {
  id: string;
  name: string;
};

export type AdminGrowthHubProps = {
  defaultSection?: GrowthSection;
  currentAdmin?: GrowthAdminIdentity;
  className?: string;
};

const sections: Array<{
  id: GrowthSection;
  label: string;
  description: string;
  icon: typeof UsersRound;
}> = [
  {
    id: "leads",
    label: "Lead pipeline",
    description: "Qualify and follow up",
    icon: UsersRound
  },
  {
    id: "appointments",
    label: "Appointments",
    description: "Test drives and visits",
    icon: CalendarClock
  },
  {
    id: "trade-ins",
    label: "Trade-ins",
    description: "Review appraisals",
    icon: HandCoins
  },
  {
    id: "alerts",
    label: "Alerts",
    description: "Subscriptions and delivery",
    icon: BellRing
  },
  {
    id: "analytics",
    label: "Sales analytics",
    description: "Conversion performance",
    icon: ChartNoAxesCombined
  },
  {
    id: "trust-packs",
    label: "Trust packs",
    description: "Vehicle proof and history",
    icon: ClipboardCheck
  }
];

export function AdminGrowthHub({
  defaultSection = "leads",
  currentAdmin,
  className
}: AdminGrowthHubProps) {
  const [activeSection, setActiveSection] = useState<GrowthSection>(defaultSection);

  function moveTabFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) {
    const key = event.key;
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) {
      return;
    }

    event.preventDefault();
    const lastIndex = sections.length - 1;
    const nextIndex =
      key === "Home"
        ? 0
        : key === "End"
          ? lastIndex
          : key === "ArrowDown" || key === "ArrowRight"
            ? (currentIndex + 1) % sections.length
            : (currentIndex - 1 + sections.length) % sections.length;
    const nextSection = sections[nextIndex];
    setActiveSection(nextSection.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`growth-${nextSection.id}-tab`)?.focus();
    });
  }

  return (
    <section
      aria-labelledby="growth-hub-title"
      className={cn("rounded-md border border-ink/10 bg-white shadow-sm", className)}
    >
      <div className="border-b border-ink/10 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-copper">
          Growth workspace
        </p>
        <div className="mt-1 flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="growth-hub-title" className="text-2xl font-black text-ink">
              Sales operations
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/65">
              Turn showroom activity into organised follow-up, appointments and
              measurable sales progress.
            </p>
          </div>
          <p className="text-xs font-semibold text-ink/55">
            Updates save inside each workspace.
          </p>
        </div>
      </div>

      <div className="grid min-h-[680px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav
          aria-label="Sales operations sections"
          className="border-b border-ink/10 bg-smoke/55 p-2 lg:border-b-0 lg:border-r"
        >
          <div
            role="tablist"
            aria-orientation="vertical"
            className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
          >
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  id={`growth-${section.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`growth-${section.id}-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveSection(section.id)}
                  onKeyDown={(event) => moveTabFocus(event, sections.indexOf(section))}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-md px-3 py-2 text-left outline-none transition focus:ring-2 focus:ring-ink/25 focus:ring-offset-1",
                    isActive
                      ? "bg-ink text-white shadow-sm"
                      : "text-ink/70 hover:bg-white hover:text-ink"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                      isActive ? "bg-white/10" : "bg-white"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {section.label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 hidden truncate text-[11px] font-semibold lg:block",
                        isActive ? "text-white/60" : "text-ink/50"
                      )}
                    >
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 p-3 sm:p-5">
          {sections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <div
                key={section.id}
                id={`growth-${section.id}-panel`}
                role="tabpanel"
                aria-labelledby={`growth-${section.id}-tab`}
                hidden={!isActive}
              >
                {section.id === "leads" ? (
                  <LeadPipeline currentAdmin={currentAdmin} />
                ) : null}
                {section.id === "appointments" ? <AppointmentManager /> : null}
                {section.id === "trade-ins" ? <TradeInManager /> : null}
                {section.id === "alerts" ? <AlertNotificationManager /> : null}
                {section.id === "analytics" ? <SalesAnalytics /> : null}
                {section.id === "trust-packs" ? <TrustPackEditor /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

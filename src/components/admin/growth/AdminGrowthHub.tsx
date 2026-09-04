"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import {
  BellRing,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  HandCoins,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";

const LeadPipeline = dynamic(() =>
  import("@/components/admin/growth/LeadPipeline").then((module) => module.LeadPipeline),
  { loading: GrowthWorkspaceLoading }
);
const AppointmentManager = dynamic(() =>
  import("@/components/admin/growth/AppointmentManager").then(
    (module) => module.AppointmentManager
  ),
  { loading: GrowthWorkspaceLoading }
);
const TradeInManager = dynamic(() =>
  import("@/components/admin/growth/TradeInManager").then(
    (module) => module.TradeInManager
  ),
  { loading: GrowthWorkspaceLoading }
);
const AlertNotificationManager = dynamic(() =>
  import("@/components/admin/growth/AlertNotificationManager").then(
    (module) => module.AlertNotificationManager
  ),
  { loading: GrowthWorkspaceLoading }
);
const SalesAnalytics = dynamic(() =>
  import("@/components/admin/growth/SalesAnalytics").then(
    (module) => module.SalesAnalytics
  ),
  { loading: GrowthWorkspaceLoading }
);
const TrustPackEditor = dynamic(() =>
  import("@/components/admin/growth/TrustPackEditor").then(
    (module) => module.TrustPackEditor
  ),
  { loading: GrowthWorkspaceLoading }
);

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
  const [visitedSections, setVisitedSections] = useState<Set<GrowthSection>>(
    () => new Set([defaultSection])
  );

  function activateSection(section: GrowthSection) {
    setActiveSection(section);
    setVisitedSections((current) => {
      if (current.has(section)) return current;
      const next = new Set(current);
      next.add(section);
      return next;
    });
  }

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
    activateSection(nextSection.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`growth-${nextSection.id}-tab`)?.focus();
    });
  }

  return (
    <section
      aria-labelledby="growth-hub-title"
      className={cn("border border-ink/20 bg-white", className)}
    >
      <div className="border-b border-ink/10 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-signal">
          Growth workspace
        </p>
        <div className="mt-1 flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="growth-hub-title" className="font-display text-3xl font-black uppercase leading-none tracking-[-0.01em] text-ink">
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
          className="border-b border-ink/15 bg-smoke/70 p-2 lg:border-b-0 lg:border-r"
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
                  onClick={() => activateSection(section.id)}
                  onKeyDown={(event) => moveTabFocus(event, sections.indexOf(section))}
                  className={cn(
                    "flex min-h-14 items-center gap-3 border-l-[3px] px-3 py-2 text-left outline-none transition focus:ring-2 focus:ring-signal/25 focus:ring-offset-1",
                    isActive
                      ? "border-l-signal bg-ink text-white"
                      : "border-l-transparent text-ink/70 hover:border-l-ink/25 hover:bg-white hover:text-ink"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center border",
                      isActive ? "border-white/15 bg-white/10" : "border-ink/10 bg-white"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-black uppercase leading-none tracking-wide">
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

            if (!visitedSections.has(section.id)) return null;

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

function GrowthWorkspaceLoading() {
  return (
    <div
      role="status"
      className="grid min-h-72 place-items-center border border-dashed border-ink/20 bg-smoke/35 px-5 text-center"
    >
      <p className="text-sm font-bold text-ink/65">Loading workspace…</p>
    </div>
  );
}

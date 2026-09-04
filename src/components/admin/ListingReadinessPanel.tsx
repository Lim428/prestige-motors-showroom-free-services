import { CheckCircle2, CircleAlert, Eye, EyeOff } from "lucide-react";
import type { ListingReadiness } from "@/components/admin/listingEditor";
import { cn } from "@/lib/utils";

export function ListingReadinessPanel({
  readiness,
  isPublished
}: {
  readiness: ListingReadiness;
  isPublished: boolean;
}) {
  const isReady = readiness.canPublish;

  return (
    <aside
      id="listing-readiness-panel"
      aria-labelledby="listing-readiness-heading"
      tabIndex={-1}
      className="border border-ink bg-ink p-4 text-white sm:p-5 xl:sticky xl:top-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-signal">
            Listing quality
          </p>
          <h3 id="listing-readiness-heading" className="mt-1 font-display text-xl font-black uppercase leading-none tracking-wide">
            {readiness.label}
          </h3>
        </div>
        <div
          role="img"
          className={cn(
            "grid h-14 w-14 shrink-0 place-items-center border-2 text-sm font-black",
            isReady
              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
              : readiness.score >= 65
                ? "border-signal/70 bg-signal/10 text-signal"
                : "border-orange-300/60 bg-orange-300/10 text-orange-200"
          )}
          aria-label={`Listing quality score ${readiness.score} out of 100`}
        >
          {readiness.score}
        </div>
      </div>

      <div
        className={cn(
          "mt-4 flex items-start gap-2 border border-l-4 px-3 py-2.5 text-xs leading-5",
          isPublished
            ? "border-emerald-300/25 border-l-emerald-400 bg-emerald-300/10 text-emerald-100"
            : "border-white/15 border-l-signal bg-white/5 text-white/75"
        )}
      >
        {isPublished ? (
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>
          {isPublished && isReady
            ? "Public: customers can find this listing in the showroom."
            : isPublished
              ? "Public is selected, but saving is blocked until the publish checks are complete."
              : isReady
                ? "Draft is ready. Select Public showroom when you want customers to see it."
                : "Draft: only administrators can access this listing while you complete it."}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {readiness.sections.map((section) => {
          const percentage = Math.round((section.score / section.maximum) * 100);

          return (
            <div key={section.label}>
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="text-white/75">{section.label}</span>
                <span>
                  {section.score}/{section.maximum}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden bg-white/15">
                <div
                  className="h-full bg-signal transition-[width] duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
          Publish gate
        </p>
        {readiness.blockers.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {readiness.blockers.slice(0, 6).map((blocker) => (
              <li
                key={blocker}
                className="flex items-start gap-2 text-xs leading-5 text-white/75"
              >
                <CircleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-200"
                  aria-hidden="true"
                />
                {blocker}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-100">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            Minimum vehicle data, copy, and gallery checks are complete. This
            listing can be published.
          </p>
        )}
        {readiness.blockers.length > 6 ? (
          <p className="mt-3 text-[11px] font-semibold text-white/50">
            +{readiness.blockers.length - 6} more required checks
          </p>
        ) : null}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
          {readiness.warnings.length > 0
            ? "Professional finishing touches"
            : "Professional quality"}
        </p>
        {readiness.warnings.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {readiness.warnings.slice(0, 5).map((warning) => (
              <li
                key={warning}
                className="flex items-start gap-2 text-xs leading-5 text-white/70"
              >
                <CircleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal"
                  aria-hidden="true"
                />
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-100">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            The listing meets all professional quality recommendations.
          </p>
        )}
        {readiness.warnings.length > 5 ? (
          <p className="mt-3 text-[11px] font-semibold text-white/50">
            +{readiness.warnings.length - 5} more recommendations
          </p>
        ) : null}
      </div>
    </aside>
  );
}

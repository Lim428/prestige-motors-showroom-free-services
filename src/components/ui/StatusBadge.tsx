import type { CarStatus, EnquiryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { titleCaseEnum } from "@/lib/format";

type Status = CarStatus | EnquiryStatus;

const styles: Record<Status, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-800 ring-emerald-200 before:bg-emerald-600",
  RESERVED: "bg-amber-50 text-amber-900 ring-amber-200 before:bg-amber-600",
  SOLD: "bg-zinc-100 text-zinc-700 ring-zinc-200 before:bg-zinc-500",
  NEW: "bg-emerald-50 text-emerald-800 ring-emerald-200 before:bg-emerald-600",
  CONTACTED: "bg-blue-50 text-blue-800 ring-blue-200 before:bg-blue-600",
  CLOSED: "bg-zinc-100 text-zinc-700 ring-zinc-200 before:bg-zinc-500",
  ARCHIVED: "bg-stone-100 text-stone-600 ring-stone-200 before:bg-stone-400"
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 before:h-1.5 before:w-1.5 before:content-['']",
        styles[status],
        className
      )}
    >
      {titleCaseEnum(status)}
    </span>
  );
}

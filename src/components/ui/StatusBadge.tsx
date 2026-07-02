import type { CarStatus, EnquiryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { titleCaseEnum } from "@/lib/format";

type Status = CarStatus | EnquiryStatus;

const styles: Record<Status, string> = {
  AVAILABLE: "bg-racing/10 text-racing ring-racing/20",
  RESERVED: "bg-champagne/20 text-amber-800 ring-champagne/30",
  SOLD: "bg-zinc-200 text-zinc-700 ring-zinc-300",
  NEW: "bg-racing/10 text-racing ring-racing/20",
  CONTACTED: "bg-blue-50 text-blue-700 ring-blue-100",
  CLOSED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  ARCHIVED: "bg-zinc-100 text-zinc-500 ring-zinc-200"
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ring-1",
        styles[status],
        className
      )}
    >
      {titleCaseEnum(status)}
    </span>
  );
}

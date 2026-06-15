import type { JobStatus } from "@prisma/client";

const statusStyles: Record<JobStatus, string> = {
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

type BadgeProps = {
  status: JobStatus;
};

export function Badge({ status }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

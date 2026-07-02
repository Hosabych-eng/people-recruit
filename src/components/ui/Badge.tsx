import type { JobStatus } from "@prisma/client";

const statusStyles: Record<JobStatus, string> = {
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const statusLabels: Record<JobStatus, string> = {
  OPEN: "Відкрита",
  DRAFT: "Чернетка",
  CLOSED: "Закрита",
};

type BadgeProps = {
  status: JobStatus;
  className?: string;
};

export function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status]} ${className}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function getJobStatusLabel(status: JobStatus) {
  return statusLabels[status];
}

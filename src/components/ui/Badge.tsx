import type { JobStatus } from "@prisma/client";
import { JOB_STATUS_LABELS, JOB_STATUS_STYLES } from "@/lib/job-status";

type BadgeProps = {
  status: JobStatus;
  className?: string;
};

export function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${JOB_STATUS_STYLES[status]} ${className}`}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

export function getJobStatusLabel(status: JobStatus) {
  return JOB_STATUS_LABELS[status];
}

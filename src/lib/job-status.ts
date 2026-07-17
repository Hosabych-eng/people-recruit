import type { JobStatus } from "@prisma/client";

export const JOB_STATUS_OPTIONS: {
  value: JobStatus;
  label: string;
}[] = [
  { value: "DRAFT", label: "Чернетка" },
  { value: "IN_REVIEW", label: "На розгляді" },
  { value: "OPEN", label: "Відкрита" },
  { value: "PAUSED", label: "Призупинена" },
  { value: "CANCELLED", label: "Скасована" },
  { value: "CLOSED", label: "Закрита" },
  { value: "ARCHIVED", label: "Заархівована" },
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Чернетка",
  IN_REVIEW: "На розгляді",
  OPEN: "Відкрита",
  PAUSED: "Призупинена",
  CANCELLED: "Скасована",
  CLOSED: "Закрита",
  ARCHIVED: "Заархівована",
};

export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_REVIEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PAUSED: "bg-orange-50 text-orange-700 ring-orange-600/20",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  ARCHIVED: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

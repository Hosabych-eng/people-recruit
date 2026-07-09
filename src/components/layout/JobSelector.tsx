import type { Job } from "@prisma/client";
import { formatDaysActive } from "@/lib/days-active";

type JobWithCounts = Job & {
  openedAt?: Date | string | null;
  _count?: { candidates: number; stages: number };
};

type JobSelectorProps = {
  jobs: JobWithCounts[];
  selectedJobId: string | null;
  onChange: (jobId: string) => void;
  disabled?: boolean;
};

export function JobSelector({
  jobs,
  selectedJobId,
  onChange,
  disabled = false,
}: JobSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="job-select" className="text-xs font-medium text-foreground">
        Вакансія
      </label>
      <select
        id="job-select"
        value={selectedJobId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || jobs.length === 0}
        className="h-8 min-w-[240px] rounded-md border border-border bg-card px-2 text-xs text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {jobs.length === 0 ? (
          <option value="">Немає вакансій</option>
        ) : (
          jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} · {formatDaysActive(job.openedAt ?? job.createdAt)} · {job.status}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

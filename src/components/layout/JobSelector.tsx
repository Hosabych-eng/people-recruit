import type { Job } from "@prisma/client";

type JobWithCounts = Job & {
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
    <div className="flex items-center gap-3">
      <label htmlFor="job-select" className="text-sm font-medium text-foreground">
        Requisition
      </label>
      <select
        id="job-select"
        value={selectedJobId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || jobs.length === 0}
        className="h-9 min-w-[280px] rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {jobs.length === 0 ? (
          <option value="">No jobs available</option>
        ) : (
          jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} ({job.status})
            </option>
          ))
        )}
      </select>
    </div>
  );
}

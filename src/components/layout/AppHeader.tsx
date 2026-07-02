import type { Job } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

type AppHeaderProps = {
  job?: Job | null;
  candidateCount?: number;
};

export function AppHeader({ job, candidateCount = 0 }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-4 py-4 shadow-sm sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            PeopleRecruit
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {job?.title ?? "Recruiting Pipeline"}
          </h1>
          {job && (
            <p className="mt-1 text-sm text-muted">
              {candidateCount} candidate{candidateCount === 1 ? "" : "s"} in
              pipeline
            </p>
          )}
        </div>

        {job && <Badge status={job.status} />}
      </div>
    </header>
  );
}

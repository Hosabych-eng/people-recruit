import type { Candidate } from "@prisma/client";
import type { JobWithPipeline } from "@/types";
import { Button } from "@/components/ui/Button";
import { findCandidateInPipeline } from "@/lib/pipeline-utils";

type CandidateDetailPanelProps = {
  pipeline: JobWithPipeline;
  candidateId: string | null;
  onClose: () => void;
};

function getStageName(pipeline: JobWithPipeline, candidate: Candidate) {
  for (const stage of pipeline.stages) {
    if (stage.candidates.some((item) => item.id === candidate.id)) {
      return stage.name;
    }
  }
  return "Unknown";
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function CandidateDetailPanel({
  pipeline,
  candidateId,
  onClose,
}: CandidateDetailPanelProps) {
  if (!candidateId) return null;

  const candidate = findCandidateInPipeline(pipeline, candidateId);
  if (!candidate) return null;

  const stageName = getStageName(pipeline, candidate);

  return (
    <>
      <button
        type="button"
        aria-label="Close candidate details"
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Candidate
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              {candidate.name}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Current stage
            </h3>
            <p className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {stageName}
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Contact
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-foreground">{candidate.email}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium text-foreground">
                  {candidate.phone ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Resume
            </h3>
            {candidate.resumeLink ? (
              <a
                href={candidate.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                View resume
              </a>
            ) : (
              <p className="text-sm text-muted">No resume uploaded</p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Timeline
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Applied</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(candidate.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Last updated</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(candidate.updatedAt)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </>
  );
}

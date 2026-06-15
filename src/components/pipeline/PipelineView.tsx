"use client";

import { useCallback, useEffect, useState } from "react";
import type { Candidate, Job } from "@prisma/client";
import type { JobWithPipeline } from "@/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { JobSelector } from "@/components/layout/JobSelector";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CandidateDetailPanel } from "@/components/candidate/CandidateDetailPanel";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { countCandidates } from "@/lib/pipeline-utils";

type JobWithCounts = Job & {
  _count: { candidates: number; stages: number };
};

export function PipelineView() {
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<JobWithPipeline | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setError(null);

    try {
      const data = await api.jobs.list();
      setJobs(data);

      if (data.length > 0) {
        const preferred =
          data.find((job) => job.status === "OPEN") ?? data[0];
        setSelectedJobId((current) => current ?? preferred.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  const loadPipeline = useCallback(async (jobId: string) => {
    setIsLoadingPipeline(true);
    setError(null);

    try {
      const data = await api.jobs.pipeline(jobId);
      setPipeline(data);
    } catch (err) {
      setPipeline(null);
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setIsLoadingPipeline(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedJobId) return;
    setSelectedCandidateId(null);
    loadPipeline(selectedJobId);
  }, [selectedJobId, loadPipeline]);

  const handleSelectCandidate = useCallback((candidate: Candidate) => {
    setSelectedCandidateId(candidate.id);
  }, []);

  const handlePipelineChange = useCallback((nextPipeline: JobWithPipeline) => {
    setPipeline(nextPipeline);
  }, []);

  const handleKanbanError = useCallback((message: string) => {
    setError(message);
  }, []);

  const isLoading = isLoadingJobs || isLoadingPipeline;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        job={pipeline}
        candidateCount={pipeline ? countCandidates(pipeline) : 0}
      />

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <JobSelector
            jobs={jobs}
            selectedJobId={selectedJobId}
            onChange={setSelectedJobId}
            disabled={isLoadingJobs}
          />

          {pipeline && (
            <p className="text-sm text-muted">
              Drag candidates between stages to update their pipeline status.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                if (selectedJobId) loadPipeline(selectedJobId);
                else loadJobs();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted">
              <Spinner className="h-8 w-8" />
              <p className="text-sm">Loading pipeline…</p>
            </div>
          </div>
        )}

        {!isLoading && !pipeline && jobs.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
            <h2 className="text-lg font-medium text-foreground">No jobs yet</h2>
            <p className="mt-2 text-sm text-muted">
              Run{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                npm run db:seed
              </code>{" "}
              to load sample requisitions and candidates.
            </p>
          </div>
        )}

        {!isLoading && pipeline && (
          <KanbanBoard
            pipeline={pipeline}
            onPipelineChange={handlePipelineChange}
            onSelectCandidate={handleSelectCandidate}
            onError={handleKanbanError}
          />
        )}
      </div>

      {pipeline && (
        <CandidateDetailPanel
          pipeline={pipeline}
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Job } from "@prisma/client";
import type { JobWithPipeline, PipelineCandidate } from "@/types";
import { JobSelector } from "@/components/layout/JobSelector";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { AddCandidateModal } from "@/components/candidate/AddCandidateModal";
import { ImportCandidateModal } from "@/components/candidate/ImportCandidateModal";
import { VacancyPipelineHeader } from "@/components/pipeline/VacancyPipelineHeader";
import { PipelineFilterBar } from "@/components/pipeline/PipelineFilterBar";
import { useAuth } from "@/components/auth/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import {
  countCandidates,
  filterPipeline,
  type CandidateSortOrder,
  type CandidateViewFilter,
  type PipelineCardFilter,
} from "@/lib/pipeline-utils";

type JobWithCounts = Job & {
  _count: { candidates: number; stages: number };
};

export function PipelineView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canManageVacancies } = useAuth();
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<JobWithPipeline | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isImportCandidateOpen, setIsImportCandidateOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<CandidateSortOrder>("newest");
  const [viewFilter, setViewFilter] = useState<CandidateViewFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilters, setCardFilters] = useState<PipelineCardFilter[]>([]);

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
      setError(err instanceof Error ? err.message : "Не вдалося завантажити вакансії");
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
      setError(err instanceof Error ? err.message : "Не вдалося завантажити воронку");
    } finally {
      setIsLoadingPipeline(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const jobFromUrl = searchParams.get("job");
    if (jobFromUrl) {
      setSelectedJobId(jobFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedJobId) return;
    setViewFilter("active");
    setSearchQuery("");
    setCardFilters([]);
    loadPipeline(selectedJobId);
  }, [selectedJobId, loadPipeline]);

  const filteredPipeline = useMemo(() => {
    if (!pipeline) return null;
    return filterPipeline(pipeline, {
      view: viewFilter,
      search: searchQuery,
      cardFilters,
    });
  }, [pipeline, viewFilter, searchQuery, cardFilters]);

  const handleSelectCandidate = useCallback(
    (candidate: PipelineCandidate) => {
      router.push(`/candidates/${candidate.id}`);
    },
    [router],
  );

  const handlePipelineChange = useCallback((nextPipeline: JobWithPipeline) => {
    setPipeline(nextPipeline);
  }, []);

  const handleKanbanError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleCandidateCreated = useCallback(async () => {
    if (!selectedJobId) return;

    try {
      const data = await api.jobs.pipeline(selectedJobId);
      setPipeline(data);
      setJobs((current) =>
        current.map((job) =>
          job.id === selectedJobId
            ? {
                ...job,
                _count: {
                  ...job._count,
                  candidates: countCandidates(data),
                },
              }
            : job,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не вдалося оновити воронку",
      );
    }
  }, [selectedJobId]);

  const handleShare = useCallback(async () => {
    if (!pipeline) return;

    const url = `${window.location.origin}/recruiting?job=${pipeline.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Посилання на вакансію:", url);
    }
  }, [pipeline]);

  const isLoading = isLoadingJobs || isLoadingPipeline;

  return (
    <>
      {pipeline && (
        <VacancyPipelineHeader
          pipeline={pipeline}
          canAddCandidate={canManageVacancies}
          onAddCandidate={() => setIsAddCandidateOpen(true)}
          onImportCandidate={() => setIsImportCandidateOpen(true)}
          onShare={handleShare}
          onEdit={() => {
            window.location.href = `/pipelines/${pipeline.id}`;
          }}
          onTabChange={(tab) => {
            if (tab === "reports") {
              router.push(`/vacancies/${pipeline.id}/reports`);
            }
          }}
        />
      )}

      <div className="flex-1 px-4 py-5 sm:px-6">
        {jobs.length > 1 && (
          <div className="mb-4">
            <JobSelector
              jobs={jobs}
              selectedJobId={selectedJobId}
              onChange={setSelectedJobId}
              disabled={isLoadingJobs}
            />
          </div>
        )}

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
              Повторити
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted">
              <Spinner className="h-8 w-8" />
              <p className="text-sm">Завантаження воронки…</p>
            </div>
          </div>
        )}

        {!isLoading && !pipeline && jobs.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
            <h2 className="text-lg font-medium text-foreground">Ще немає вакансій</h2>
            <p className="mt-2 text-sm text-muted">
              Запустіть{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                npm run db:seed
              </code>{" "}
              щоб завантажити приклади.
            </p>
          </div>
        )}

        {!isLoading && pipeline && filteredPipeline && (
          <>
            <PipelineFilterBar
              pipeline={filteredPipeline}
              viewFilter={viewFilter}
              onViewFilterChange={setViewFilter}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              cardFilters={cardFilters}
              onCardFiltersChange={setCardFilters}
            />

            <KanbanBoard
              pipeline={filteredPipeline}
              fullPipeline={pipeline}
              sortOrder={sortOrder}
              onPipelineChange={handlePipelineChange}
              onSelectCandidate={handleSelectCandidate}
              onError={handleKanbanError}
            />
          </>
        )}
      </div>

      {pipeline && (
        <>
          <AddCandidateModal
            pipeline={pipeline}
            isOpen={isAddCandidateOpen}
            onClose={() => setIsAddCandidateOpen(false)}
            onCreated={handleCandidateCreated}
          />
          <ImportCandidateModal
            pipeline={{
              id: pipeline.id,
              title: pipeline.title,
              stages: pipeline.stages.map((stage) => ({
                id: stage.id,
                name: stage.name,
              })),
            }}
            isOpen={isImportCandidateOpen}
            onClose={() => setIsImportCandidateOpen(false)}
            onImported={handleCandidateCreated}
          />
        </>
      )}
    </>
  );
}

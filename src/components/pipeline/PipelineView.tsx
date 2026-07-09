"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Job } from "@prisma/client";
import type { JobWithPipeline, PipelineCandidate } from "@/types";
import { JobSelector } from "@/components/layout/JobSelector";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { AddCandidateModal } from "@/components/candidate/AddCandidateModal";
import { BulkResumeDropzone } from "@/components/candidate/BulkResumeDropzone";
import { ImportCandidateModal } from "@/components/candidate/ImportCandidateModal";
import {
  CreateVacancyModal,
  type CreatedVacancy,
} from "@/components/careers/CreateVacancyModal";
import { VacancyPipelineHeader } from "@/components/pipeline/VacancyPipelineHeader";
import { PipelineFilterBar } from "@/components/pipeline/PipelineFilterBar";
import { CandidateQuickPeekDrawer } from "@/components/pipeline/CandidateQuickPeekDrawer";
import { CandidateCompareBar } from "@/components/pipeline/CandidateCompareBar";
import { CandidateCompareModal } from "@/components/pipeline/CandidateCompareModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import {
  countCandidates,
  filterPipeline,
  moveCandidateBetweenStages,
  type CandidateSortOrder,
  type CandidateViewFilter,
  type PipelineCardFilter,
} from "@/lib/pipeline-utils";
import { usePipelineKeyboardShortcuts } from "@/hooks/usePipelineKeyboardShortcuts";

type JobWithCounts = Job & {
  _count: { candidates: number; stages: number };
};

export function PipelineView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canManageVacancies, isAdmin, user } = useAuth();
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<JobWithPipeline | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isImportCandidateOpen, setIsImportCandidateOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<"pdf" | "peopleforce">("pdf");
  const [peopleforceToken, setPeopleforceToken] = useState("");
  const [peopleforceVacancy, setPeopleforceVacancy] = useState("");
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [isCreateVacancyOpen, setIsCreateVacancyOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<CandidateSortOrder>("newest");
  const [viewFilter, setViewFilter] = useState<CandidateViewFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilters, setCardFilters] = useState<PipelineCardFilter[]>([]);
  const [blindHiring, setBlindHiring] = useState(false);
  const [talentPoolTagId, setTalentPoolTagId] = useState<string | undefined>();
  const [talentPoolTags, setTalentPoolTags] = useState<{ id: string; name: string }[]>([]);
  const [peekCandidateId, setPeekCandidateId] = useState<string | null>(null);
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [focusedCandidateId, setFocusedCandidateId] = useState<string | null>(null);
  const [compareSelected, setCompareSelected] = useState<PipelineCandidate[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

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
    void fetch("/api/candidate-tags")
      .then((response) => response.json())
      .then((items) => setTalentPoolTags(items))
      .catch(() => setTalentPoolTags([]));
  }, []);

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
      talentPoolTagId,
    });
  }, [pipeline, viewFilter, searchQuery, cardFilters, talentPoolTagId]);

  const handleSelectCandidate = useCallback((candidate: PipelineCandidate) => {
    setFocusedCandidateId(candidate.id);
    setPeekCandidateId(candidate.id);
    setIsPeekOpen(true);
  }, []);

  const handleToggleCompare = useCallback((candidate: PipelineCandidate) => {
    setCompareSelected((current) => {
      const exists = current.some((row) => row.id === candidate.id);
      if (exists) return current.filter((row) => row.id !== candidate.id);
      if (current.length >= 3) return current;
      return [...current, candidate];
    });
  }, []);

  const handleKeyboardMove = useCallback(
    async (candidateId: string, targetStageId: string) => {
      if (!pipeline) return;
      const previousPipeline = pipeline;
      const optimisticPipeline = moveCandidateBetweenStages(
        pipeline,
        candidateId,
        targetStageId,
      );
      setPipeline(optimisticPipeline);
      try {
        await api.candidates.updateStage(candidateId, targetStageId);
      } catch (err) {
        setPipeline(previousPipeline);
        setError(err instanceof Error ? err.message : "Failed to move candidate");
      }
    },
    [pipeline],
  );

  usePipelineKeyboardShortcuts({
    pipeline: filteredPipeline,
    focusedCandidateId,
    onFocusCandidate: setFocusedCandidateId,
    onToggleDrawer: () => {
      if (!focusedCandidateId) return;
      setPeekCandidateId(focusedCandidateId);
      setIsPeekOpen((open) => !open);
    },
    onOpenCreateModal: () => setIsAddCandidateOpen(true),
    onMoveCandidate: (candidateId, targetStageId) => {
      void handleKeyboardMove(candidateId, targetStageId);
    },
    enabled: Boolean(filteredPipeline),
  });

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

  const handleVacancyCreated = useCallback(
    async (job: CreatedVacancy) => {
      setError(null);
      setIsCreateVacancyOpen(false);
      await loadJobs();
      setSelectedJobId(job.id);
    },
    [loadJobs],
  );

  const isLoading = isLoadingJobs || isLoadingPipeline;

  const handlePeopleForceSync = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const apiToken = peopleforceToken.trim();
      if (!apiToken) {
        setImportErrorMessage("PeopleForce API Key is required");
        return;
      }

      setIsSyncLoading(true);
      setImportErrorMessage(null);
      setImportSuccessMessage(null);

      try {
        const response = await fetch("/api/import/peopleforce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiToken,
            vacancyIdOrUrl: peopleforceVacancy.trim() || undefined,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "PeopleForce sync failed");
        }

        const importedCount = Number(payload.candidatesCreated ?? 0);
        setImportSuccessMessage(`Successfully imported ${importedCount} candidates!`);
        await handleCandidateCreated();
      } catch (error) {
        setImportErrorMessage(
          error instanceof Error ? error.message : "PeopleForce sync failed",
        );
      } finally {
        setIsSyncLoading(false);
      }
    },
    [handleCandidateCreated, peopleforceToken, peopleforceVacancy],
  );

  return (
    <>
      {isAdmin && (
        <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setIsCreateVacancyOpen(true)}>
              + Створити вакансію
            </Button>
          </div>
        </div>
      )}

      {pipeline && (
        <VacancyPipelineHeader
          pipeline={pipeline}
          canAddCandidate={canManageVacancies}
          canManageJob={isAdmin}
          onAddCandidate={() => setIsAddCandidateOpen(true)}
          onImportCandidate={() => setIsImportCandidateOpen(true)}
          onShare={handleShare}
          onEdit={() => {
            router.push(`/pipelines/${pipeline.id}`);
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
              {isAdmin
                ? "Створіть першу вакансію для початку роботи з воронкою."
                : "Зверніться до адміністратора для створення вакансій."}
            </p>
            {isAdmin && (
              <Button className="mt-4" size="sm" onClick={() => setIsCreateVacancyOpen(true)}>
                + Створити вакансію
              </Button>
            )}
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
              onOpenImportModal={() => setIsImportModalOpen(true)}
              blindHiring={blindHiring}
              onBlindHiringChange={setBlindHiring}
              talentPoolTagId={talentPoolTagId}
              onTalentPoolTagChange={setTalentPoolTagId}
              talentPoolTags={talentPoolTags}
            />

            <KanbanBoard
              pipeline={filteredPipeline}
              fullPipeline={pipeline}
              sortOrder={sortOrder}
              onPipelineChange={handlePipelineChange}
              onSelectCandidate={handleSelectCandidate}
              onError={handleKanbanError}
              focusedCandidateId={focusedCandidateId}
              blindHiring={blindHiring}
              compareSelectedIds={compareSelected.map((row) => row.id)}
              onToggleCompare={handleToggleCompare}
              recruiterName={user?.name ?? "Recruiter"}
            />

            <CandidateCompareBar
              selected={compareSelected}
              onClear={() => setCompareSelected([])}
              onCompare={() => setIsCompareOpen(true)}
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

      {pipeline && canManageVacancies && isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">Import Candidates</h2>
              <button
                type="button"
                aria-label="Close import modal"
                className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-slate-100 hover:text-foreground"
                onClick={() => setIsImportModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="border-b border-border px-5 pt-4">
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setImportTab("pdf")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    importTab === "pdf"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Upload Resumes (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab("peopleforce")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    importTab === "peopleforce"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  PeopleForce Import
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {importTab === "pdf" ? (
                <BulkResumeDropzone
                  jobId={pipeline.id}
                  stageId={pipeline.stages[0]?.id ?? ""}
                  onComplete={() => void handleCandidateCreated()}
                />
              ) : (
                <form className="space-y-4" onSubmit={handlePeopleForceSync}>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">PeopleForce API Key</label>
                    <input
                      type="password"
                      value={peopleforceToken}
                      onChange={(event) => setPeopleforceToken(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      placeholder="pf_xxxxxxxxxxxxxxxxx"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      PeopleForce Vacancy ID / URL
                    </label>
                    <input
                      type="text"
                      value={peopleforceVacancy}
                      onChange={(event) => setPeopleforceVacancy(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      placeholder="12345 or https://app.peopleforce.io/..."
                    />
                  </div>

                  {importSuccessMessage && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {importSuccessMessage}
                    </div>
                  )}
                  {importErrorMessage && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {importErrorMessage}
                    </div>
                  )}

                  <Button type="submit" size="sm" disabled={isSyncLoading}>
                    {isSyncLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        Syncing...
                      </span>
                    ) : (
                      "Sync Candidates"
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <CreateVacancyModal
          isOpen={isCreateVacancyOpen}
          onClose={() => setIsCreateVacancyOpen(false)}
          onCreated={handleVacancyCreated}
        />
      )}

      {pipeline && (
        <>
          <CandidateQuickPeekDrawer
            candidateId={peekCandidateId}
            isOpen={isPeekOpen}
            blindHiring={blindHiring}
            jobId={pipeline.id}
            onClose={() => setIsPeekOpen(false)}
          />
          <CandidateCompareModal
            isOpen={isCompareOpen}
            candidates={compareSelected}
            blindHiring={blindHiring}
            onClose={() => setIsCompareOpen(false)}
          />
        </>
      )}
    </>
  );
}
